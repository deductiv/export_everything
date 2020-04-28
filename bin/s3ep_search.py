#!/usr/bin/env python
# Python 2 and 3 compatible
# s3ep_search.py
# Push Splunk search results to AWS S3 - Search Command
#
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 1.0 (2020-04-24)

from __future__ import print_function
from builtins import str
from future import standard_library
standard_library.install_aliases()
import logging
import sys, os
import time, datetime
from splunk.clilib import cli_common as cli

# Add lib folder to import path
path_prepend = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib')
sys.path.append(path_prepend)

import splunklib.client as client
import splunklib.results as results
from splunklib.searchcommands import ReportingCommand, dispatch, Configuration, Option, validators
from CsvResultParser import *
from deductiv_helpers import *
import boto3

def flush_buffer(list, output_file):
	with open(output_file, "a") as f:
		f.writelines(list)

# Define class and type for Splunk command
@Configuration()
class s3ep(ReportingCommand):
	doc='''
	**Syntax:**
	search | s3ep region=<region> bucket=<bucket> outputfile=<output filename> outputformat=[json|raw|kv|csv|tsv|pipe]

	**Description**
	Push Splunk events to AWS S3 over JSON or raw text.
	'''

	#Define Parameters
	region = Option(
		doc='''
		**Syntax:** **region=***<AWS region>*
		**Description:** The name of the AWS region where the AWS bucket lives 
		**Default:** The region defined in hep.conf, aws stanza''',
		require=False)

	bucket = Option(
		doc='''
		**Syntax:** **bucket=***<bucket name>*
		**Description:** The name of the destination S3 bucket
		**Default:** The bucket name defined in hep.conf, aws stanza''',
		require=False)

	outputfile = Option(
		doc='''
		**Syntax:** **outputfile=***<file name>*
		**Description:** The name of the file to be written to the S3 bucket
		**Default:** The name of the user plus the timestamp and the output format, e.g. admin_1588000000.log
			json=.json, csv=.csv, kvpairs=.log, raw=.log''',
		require=False)

	outputformat = Option(
		doc='''
		**Syntax:** **outputformat=***[json|raw|kv|csv|tsv|pipe]*
		**Description:** The format written for the output events/search results
		**Default:** *raw* if the *_raw* field is in the search, otherwise *json*''',
		require=False) 

	fields = Option(
		doc='''
		**Syntax:** **fields=***"field1, field2, field3"*
		**Description:** The fields to be written to the S3 file
		**Default:** All''',
		require=False, validate=validators.List()) 

	# Validators found @ https://github.com/splunk/splunk-sdk-python/blob/master/splunklib/searchcommands/validators.py

	def __getitem__(self, key):
		return getattr(self,key)

	def map(self, events):
		for e in events:
			yield(e)

	#define main function
	def reduce(self, events):
		script = os.path.basename(__file__)

		logger = setup_logging('hep')
		logger.info('S3EP search command initiated')

		# Enumerate proxy settings
		http_proxy = os.environ.get('HTTP_PROXY')
		https_proxy = os.environ.get('HTTPS_PROXY')
		proxy_exceptions = os.environ.get('NO_PROXY')

		if http_proxy is not None:
			logger.debug("HTTP proxy: %s" % http_proxy)
		if https_proxy is not None:
			logger.debug("HTTPS proxy: %s" % https_proxy)
		if proxy_exceptions is not None:
			logger.debug("Proxy Exceptions: %s" % proxy_exceptions)

		# Enumerate settings
		session_key = self._metadata.searchinfo.session_key
		splunkd_uri = self._metadata.searchinfo.splunkd_uri
		app = self._metadata.searchinfo.app
		user = self._metadata.searchinfo.username
		owner = self._metadata.searchinfo.owner
		dispatch = self._metadata.searchinfo.dispatch_dir

		try:
			cfg = cli.getConfStanza('hep','aws')
			#logger.debug(str(cfg))
		except BaseException as e:
			logger.critical("Error reading app configuration. No target servers: " + repr(e))
			exit(1)

		# Set defaults
		if self.region is None:
			if 'default_region' in list(cfg.keys()):
				t = cfg['default_region']
				if t is not None and len(t) > 0:
					self.region = t
				else:
					logger.critical("No region specified")
					exit(1)
			else:
				logger.critical("No region specified")
				exit(1)

		if self.bucket is None:
			if 'default_s3_bucket' in list(cfg.keys()):
				t = cfg['default_s3_bucket']
				if t is not None and len(t) > 0:
					self.bucket = t
				else:
					logger.critical("No bucket specified")
					exit(1)
			else:
				logger.critical("No bucket specified")
				exit(1)

		# Special event key fields that can be specified/overridden
		meta_keys = ['source', 'sourcetype', 'host', 'index']
		buf = []
		buffer_flush_count = 1000
		event_counter = 0

		file_extensions = {
			'raw':  '.log',
			'kv':   '.log',
			'csv':  '.csv',
			'json': '.json'
		}

		for event in events:
			# Get the fields list for the event
			# Filter the fields if fields= is supplied
			if self.fields is not None:
				event_keys = []
				for k in list(event.keys()):
					if k in self.fields:
						event_keys.append(k)
			else:
				event_keys = list(event.keys())

			# Pick the output format on the first event if one was not specified
			if event_counter == 0:
				if self.outputformat is None and '_raw' in event_keys:
					self.outputformat = 'raw'
				elif self.outputformat is None:
					self.outputformat = 'json'

				now = str(int(time.time()))
				nowft = datetime.datetime.now().strftime("%F_%H%M%S")
				today = datetime.datetime.now().strftime("%F")
				if self.outputfile is None:
					# Boto is special. We need repr to give it the encoding it expects to match the hashing.
					self.outputfile = repr(app + '_' + user + '_' +  + file_extensions[self.outputformat])
				else:
					self.outputfile = self.outputfile.replace("__now__", now)
					self.outputfile = self.outputfile.replace("__nowft__", nowft)
					self.outputfile = self.outputfile.replace("__today__", today)
				local_output = os.path.join(dispatch, 's3ep_staging.txt')

				# Check event format setting and write a header if needed
				if self.outputformat == "csv" or self.outputformat == "tsv" or self.outputformat == "pipe":
					delimiters = {
						'csv': ',',
						'tsv': '\t',
						'pipe': '|'
					}
					delimiter = delimiters[self.outputformat]
					# Write header
					header = ''
					for field in event_keys:
						# Quote the string if it has a space
						if ' ' in field and self.outputformat == "csv":
							field = '"' + field + '"'
						# Concatenate the header field names
						header += field + delimiter
					# Strip off the last delimiter
					header = header[:-1] + '\n'
					buf.append(header)

			output_text = ''
			# Build the row of text
			if self.outputformat == "raw":
				if '_raw' in event_keys:
					output_text = event["_raw"]
				else:
					logger.warning("No raw field when raw output selected.")
			elif self.outputformat == "csv" or self.outputformat == "tsv" or self.outputformat == "pipe":
				for key, value in list(event.items()):
					if key in event_keys:
						if self.outputformat == "csv":
							# Escape any double-quotes
							if '"' in value:
								# String has a quotation mark. Quote it and escape those inside.
								value = escape_quotes(value)
								value = '"' + value + '"'
							# Quote the string if it has a space or separator
							elif ' ' in value or ',' in value:
								value = '"' + value + '"'
						
						output_text += value + delimiter
				output_text = output_text[:-1]
			elif self.outputformat == "kv":
				for key, value in list(event.items()):
					if key in event_keys:
						# Escape any double-quotes
						if '"' in value:
							# String has a quotation mark. Quote it and escape those inside.
							value = escape_quotes(value)
							value = '"' + value + '"'
						# Quote the string if it has a space or separator
						elif ' ' in value or '=' in value:
							value = '"' + value + '"'

						output_text += key + "=" + value + ' '
			elif self.outputformat == "json":
				if self.fields is not None:
					json_event = {}
					for key in event_keys:
						json_event[key] = event[key]
				else:
					json_event = event
				output_text = json.dumps(json_event)

			buf.append(output_text + '\n')
			event_counter += 1
			# Append text entry to list
			if len(buf) == buffer_flush_count:
				flush_buffer(buf, local_output)
				buf = []

			yield(event)

		flush_buffer(buf, local_output)
		buf = None
		logger.debug("Wrote temp output file " + local_output)

		# Get the credentials from the search head
		creds = get_credentials('deductiv_hep', session_key)
		try:
			for c in creds:
				if c["realm"] == self.region:
					aws_access_key = c["username"]
					aws_secret_key = c["password"]
		except BaseException as e:
			logger.critical("Error downloading access key: " + repr(e))
		#logger.debug("Access key: %s / secret: %s" % (aws_access_key, aws_secret_key))
		logger.debug("Output file: %s" % self.outputfile)

		# Upload file to s3
		try:
			s3 = boto3.client(
				's3',
				aws_access_key_id=aws_access_key,
				aws_secret_access_key=aws_secret_key)
			with open(local_output, "rb") as f:
				s3.upload_fileobj(f, self.bucket, self.outputfile)
		except BaseException as e:
			logger.critical("Could not upload file to S3: " + repr(e))
			exit(1)

		logger.info("Successfully pushed events to s3. app=%s count=%s region=%s bucket=%s file=%s user=%s" % (app, event_counter, self.region, self.bucket, self.outputfile, user))

dispatch(s3ep, sys.argv, sys.stdin, sys.stdout, __name__)

