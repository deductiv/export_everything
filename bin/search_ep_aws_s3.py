#!/usr/bin/env python

# Copyright 2022 Deductiv Inc.
# search_ep_aws_s3.py
# Export Splunk search results to AWS S3 - Search Command
#
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.1.0 (2022-12-02)

import sys
import os
import random
from deductiv_helpers import setup_logger, \
	replace_keywords, \
	exit_error, \
	replace_object_tokens, \
	recover_parameters, \
	str2bool, \
	log_proxy_settings
from ep_helpers import get_config_from_alias, get_aws_connection
import event_file
from splunk.clilib import cli_common as cli

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from splunklib.searchcommands import EventingCommand, dispatch, Configuration, Option, validators

# Define class and type for Splunk command
@Configuration()
class epawss3(EventingCommand):
	'''
	**Syntax:**
	search | epawss3 target=<target alias> bucket=<bucket> outputfile=<output path/filename> outputformat=[json|raw|kv|csv|tsv|pipe]

	**Description**
	Export Splunk events to AWS S3 (or compatible) over JSON or raw text.
	'''

	#Define Parameters
	target = Option(
		doc='''
		**Syntax:** **target=***<target alias>*
		**Description:** The name of the AWS target alias provided on the configuration dashboard
		**Default:** The target configured as "Default" within the AWS S3 Setup page (if any)''',
		require=False)

	bucket = Option(
		doc='''
		**Syntax:** **bucket=***<bucket name>*
		**Description:** The name of the destination S3 bucket
		**Default:** The bucket name from the AWS S3 Setup page (if any)''',
		require=False)

	outputfile = Option(
		doc='''
		**Syntax:** **outputfile=***<output path/filename>*
		**Description:** The path and filename to be written to the S3 bucket
		**Default:** The name of the user plus the timestamp and the output format, e.g. admin_1588000000.log
			json=.json, csv=.csv, tsv=.tsv, pipe=.log, kv=.log, raw=.log''',
		require=False)

	outputformat = Option(
		doc='''
		**Syntax:** **outputformat=***[json|raw|kv|csv|tsv|pipe]*
		**Description:** The format written for the output events/search results
		**Default:** *csv*''',
		require=False) 

	fields = Option(
		doc='''
		**Syntax:** **fields=***"field1, field2, field3"*
		**Description:** Limit the fields to be written to the S3 file
		**Default:** All (Unspecified)''',
		require=False, validate=validators.List()) 

	compress = Option(
		doc='''
		**Syntax:** **compress=***[true|false]*
		**Description:** Option to compress the output file into .gz format before uploading
		**Default:** The setting from the target configuration, or True if .gz is in the filename ''',
		require=False, validate=validators.Boolean())

	# Validators found @ https://github.com/splunk/splunk-sdk-python/blob/master/splunklib/searchcommands/validators.py

	@Configuration()
	def transform(self, events):
		if getattr(self, 'first_chunk', True):
			setattr(self, 'first_chunk', False)
			first_chunk = True
		else:
			first_chunk = False
		
		try:
			app_config = cli.getConfStanza('ep_general','settings')
			cmd_config = cli.getConfStanzas('ep_aws_s3')
		except BaseException as e:
			raise Exception("Could not read configuration: " + repr(e))

		# Facility info - prepended to log lines
		facility = os.path.basename(__file__)
		facility = os.path.splitext(facility)[0]
		try:
			logger = setup_logger(app_config["log_level"], 'export_everything.log', facility)
		except BaseException as e:
			raise Exception("Could not create logger: " + repr(e))

		if first_chunk:
			logger.info('AWS S3 Export search command initiated')
			logger.debug('search_ep_awss3 command: %s', self)  # logs command line
			log_proxy_settings(logger)

		# Enumerate settings
		app = self._metadata.searchinfo.app
		user = self._metadata.searchinfo.username
		dispatch = self._metadata.searchinfo.dispatch_dir
		session_key = self._metadata.searchinfo.session_key

		if self.target is None and 'target=' in str(self):
			recover_parameters(self)
		# Replace all tokenized parameter strings
		replace_object_tokens(self)

		# Build the configuration
		try:
			target_config = get_config_from_alias(session_key, cmd_config, stanza_guid_alias=self.target, log=first_chunk)
			if target_config is None:
				exit_error(logger, "Unable to find target configuration (%s)." % self.target, 100937)
		except BaseException as e:
			exit_error(logger, "Error reading target server configuration: " + repr(e), 124812)
		
		if self.bucket is None:
			if 'default_s3_bucket' in list(target_config.keys()):
				t = target_config['default_s3_bucket']
				if t is not None and len(t) > 0:
					self.bucket = t
				else:
					exit_error(logger, "No bucket specified", 4)
			else:
				exit_error(logger, "No bucket specified", 5)
		
		# If the parameters are not supplied or blank (alert actions), supply defaults
		self.outputformat = 'csv' if (self.outputformat is None or self.outputformat == "") else self.outputformat
		self.fields = None if (self.fields is not None and self.fields == "") else self.fields

		# Read the compress value from the target config unless one was specified in the search
		if self.compress is None:
			try:
				self.compress = str2bool(target_config['compress'])
			except:
				self.compress = False

		# First run and no remote output file string has been assigned
		if not hasattr(self, 'remote_output_file'):
			if self.outputfile is None or self.outputfile == "":
				# Boto is special. We need repr to give it the encoding it expects to match the hashing.
				self.outputfile = repr('export_' + user + '___now__' + event_file.file_extensions[self.outputformat]).strip("'")
			
			# Replace keywords from output filename
			self.outputfile = replace_keywords(self.outputfile)
			self.outputfile = self.outputfile.lstrip('/')

			# Append .gz to the output file if compress=true
			if not self.compress and self.outputfile.endswith('.gz'):
				# We have a .gz extension when compression was not specified. Enable compression.
				self.compress = True
			elif self.compress and not self.outputfile.endswith('.gz'):
				# We have compression with no gz extension. Add .gz.
				self.outputfile = self.outputfile + '.gz'
			
			setattr(self, 'remote_output_file', self.outputfile)
		
			# First run and no local output file string has been assigned
			# Use the random number to support running multiple outputs in a single search
			random_number = str(random.randint(10000, 100000))
			staging_filename = f"export_everything_staging_aws_s3_{random_number}.txt"
			setattr(self, 'local_output_file', os.path.join(dispatch, staging_filename))
			if self.compress:
				self.local_output_file = self.local_output_file + '.gz'

			logger.debug(f"remote_file=\"{self.outputfile}\", " + \
				f"compression={self.compress}, " + \
				f"staging_file=\"{self.local_output_file}\"")
			
			setattr(self, 'event_counter', 0)
			append = False

			try:
				setattr(self, 's3', get_aws_connection(target_config))
			except BaseException as e:
				exit_error(logger, "Could not connect to AWS: " + repr(e), 741423)
				
		else:
			# Persistent variable is populated from a prior chunk/iteration.
			# Use the previous local output file and append to it.
			append = True
		
		# Write the output file to disk in the dispatch folder
		logger.debug("Writing events. file=\"%s\", format=%s, compress=%s, fields=\"%s\"", \
			self.local_output_file, self.outputformat, self.compress, \
			self.fields if self.fields is not None else "")
		for event in event_file.write_events_to_file(events, self.fields, self.local_output_file, self.outputformat, self.compress, append=append, finish=self._finished):
			yield event
			self.event_counter += 1
		
		# Write the data to S3 after the very last chunk has been processed
		if self._finished or self._finished is None:
			# Upload file to s3
			try:
				with open(self.local_output_file, "rb") as f:
					self.s3.upload_fileobj(f, self.bucket, self.remote_output_file)
				self.s3 = None
				logger.info("Successfully exported events to s3. app=%s count=%s bucket=%s file=%s user=%s" % (app, self.event_counter, self.bucket, self.remote_output_file, user))
				os.remove(self.local_output_file)
			except self.s3.exceptions.NoSuchBucket as e:
				exit_error(logger, "Error: No such bucket", 123833)
			except BaseException as e:
				exit_error(logger, "Could not upload file to S3: " + repr(e), 9)

dispatch(epawss3, sys.argv, sys.stdin, sys.stdout, __name__)


