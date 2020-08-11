#!/usr/bin/env python

# Copyright 2020 Deductiv Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Python 2 and 3 compatible
# s3ep_search.py
# Push Splunk search results to AWS S3 - Search Command
#
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 1.1.2 (2020-06-29)

from __future__ import print_function
from builtins import str
from future import standard_library
standard_library.install_aliases()
import logging
import sys, os, platform
import time, datetime
import random
import re

# Add lib folders to import path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))

import splunklib.client as client
import splunklib.results as results
from splunk.clilib import cli_common as cli
import splunk.entity as entity
from splunklib.searchcommands import ReportingCommand, dispatch, Configuration, Option, validators
from deductiv_helpers import *
import event_file
import boto3

# https://github.com/HurricaneLabs/splunksecrets/blob/master/splunksecrets.py
from splunksecrets import decrypt

def str2bool(v):
	return str(v).lower() in ("yes", "y", "true", "t", "1") or v == 1

# Define class and type for Splunk command
@Configuration()
class s3ep(ReportingCommand):
	doc='''
	**Syntax:**
	search | s3ep bucket=<bucket> outputfile=<output filename> outputformat=[json|raw|kv|csv|tsv|pipe]

	**Description**
	Push Splunk events to AWS S3 over JSON or raw text.
	'''

	#Define Parameters
	credential = Option(
		doc='''
		**Syntax:** **credential=***<AWS credential>*
		**Description:** The name of the AWS credential given by the user 
		**Default:** The credential defined in hep.conf, aws stanza''',
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

	compression = Option(
		doc='''
		**Syntax:** **compression=***[true|false]*
		**Description:** Option to compress the output file into .gz format before writing to S3
		**Default:** False, or True if .gz is in the filename''',
		require=False, validate=validators.Boolean())

	# Validators found @ https://github.com/splunk/splunk-sdk-python/blob/master/splunklib/searchcommands/validators.py
	
	def __getitem__(self, key):
		return getattr(self,key)
	
	def map(self, events):
		for e in events:
			yield(e)

	#define main function
	def reduce(self, events):
		#script = os.path.basename(__file__)

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
		#session_key = self._metadata.searchinfo.session_key
		#splunkd_uri = self._metadata.searchinfo.splunkd_uri
		app = self._metadata.searchinfo.app
		user = self._metadata.searchinfo.username
		#owner = self._metadata.searchinfo.owner
		dispatch = self._metadata.searchinfo.dispatch_dir

		try:
			cfg = cli.getConfStanza('hep','aws')
			logger.debug(str(cfg))
		except BaseException as e:
			logger.critical("Error reading app configuration. No target servers: " + repr(e))
			exit(1)
		
		
		# Check to see if we have credentials or if use_arn is specified
		# Check first for credential being specified
		if self.credential is not None or len(cfg['default_credential']) > 0:
			# A credential was given explicitly or a default is specified.
			credentials = {}
			logger.debug("Default credential: %s", str(cfg['default_credential']))
			for key, value in list(cfg.items()):
				if value is not None and len(value) > 0:
					#logger.debug("Key string: " + key)
					#logger.debug("Key value: " + value)
					if key[:10] == 'credential':
						logger.debug("Parsing %s (%s)", key, value)
						default = False
						try:
							alias, username, password_encrypted = value.split(':')
							if cfg['default_credential'] in [alias, key]:
								default = True
							credentials[alias] = {
								'username':				username,
								'password_encrypted': 	password_encrypted,
								'is_default':			default
							}

						except BaseException as e:
							# Invalid record
							logger.warning("Discarded credential %s (%s): %s", key, value, repr(e))


			#logger.debug("Creds: " + str(credentials))
			try:
				# If a credential was specified in the search arguments
				if self.credential is not None:
					# Look for the credential alias specified
					self.credential = credentials[self.credential]
					logger.debug("Using specified credential")
				else:
					# Use the default credential
					for cred, cred_dict in list(credentials.items()):
						if cred_dict['is_default']:
							self.credential = cred_dict
				logger.debug(self.credential)

				# Check for encryption
				if self.credential['password_encrypted'][:1] == '$':
					# Decrypt the password
					# Read the splunk.secret file
					with open(os.path.join(os.getenv('SPLUNK_HOME'), 'etc', 'auth', 'splunk.secret'), 'r') as ssfh:
						splunk_secret = ssfh.readline()
					#logger.debug(splunk_secret)

					# Call the decrypt function from splunksecrets.py
					self.credential['password'] = decrypt(splunk_secret, self.credential['password_encrypted'])
				else:
					# Not encrypted in the config
					self.credential['password'] = self.credential['password_encrypted']

				aws_access_key = self.credential['username']
				aws_secret_key = self.credential['password']
				#logger.debug(credential['password'])
			except BaseException as e: 
				logger.exception("Could not find or decrypt the specified credential: " + repr(e))
				print("Could not find or decrypt the specified credential")
				exit(230494)
			
		elif str2bool(cfg['use_arn']):
			logger.debug("Using ARN to connect")
		
		if self.bucket is None:
			if 'default_s3_bucket' in list(cfg.keys()):
				t = cfg['default_s3_bucket']
				if t is not None and len(t) > 0:
					self.bucket = t
				else:
					logger.critical("No bucket specified")
					exit(4)
			else:
				logger.critical("No bucket specified")
				exit(5)
		
		file_extensions = {
			'raw':  '.log',
			'kv':   '.log',
			'pipe': '.log',
			'csv':  '.csv',
			'tsv':  '.tsv',
			'json': '.json'
		}

		if self.outputformat is None:
			self.outputformat = 'csv'

		if self.outputfile is None:
			# Boto is special. We need repr to give it the encoding it expects to match the hashing.
			now = str(int(time.time()))
			self.outputfile = repr(app + '_' + user + '_' + now + file_extensions[self.outputformat]).strip("'")

		if self.compression:
			logger.debug('Compression: %s', self.compression)
		else:
			try:
				self.compression = cfg.get('compression')
			except:
				self.compression = False
		
		staging_filename = 'eventpush_staging.txt'
		local_output_file = os.path.join(dispatch, staging_filename)

		# Append .gz to the output file if compression=true
		if not self.compression and len(self.outputfile) > 3:
			# We have a .gz extension when compression was not specified. Enable compression.
			if self.outputfile[-3:] == '.gz':
				self.compression = True
		elif self.compression and len(self.outputfile) > 3:
			if self.outputfile[-3:] != '.gz':
				self.outputfile = self.outputfile + '.gz'

		if self.compression:
			local_output_file = local_output_file + '.gz'
		
		event_counter = 0
		# Write the output file to disk in the dispatch folder
		logger.debug("Writing events to file %s in %s format. Compression=%s\n\tfields=%s", local_output_file, self.outputformat, self.compression, self.fields)
		for event in event_file.write_events_to_file(events, self.fields, local_output_file, self.outputformat, self.compression):
			yield event
			event_counter += 1

		now = str(int(time.time()))
		nowft = datetime.datetime.now().strftime("%F_%H%M%S")
		today = datetime.datetime.now().strftime("%F")
		self.outputfile = self.outputfile.replace("__now__", now)
		self.outputfile = self.outputfile.replace("__nowft__", nowft)
		self.outputfile = self.outputfile.replace("__today__", today)
		
		logger.debug("Staging file: %s" % local_output_file)

		use_arn = cfg['use_arn']
		random_number = str(random.randint(10000, 100000))

		if self.credential is not None:
			
			# Use the credential to connect to S3
			try:
				s3 = boto3.client(
					's3',
					aws_access_key_id=aws_access_key,
					aws_secret_access_key=aws_secret_key)
				logger.debug("Connected using OAuth credential")
			except BaseException as e:
				logger.critical("Could not connect to S3 using OAuth keys: " + repr(e))
				print("Could not connect to S3 using OAuth keys: " + repr(e))
				exit(6)
		
		elif str2bool(use_arn):
			# Get the ARN from the configuration
			# If a specific ARN is specified, use that

			# Otherwise, use the current/caller identity from the EC2 instance
			# 
			# Use the ARN to connect to S3
			try:
				
				account_arn_current = boto3.client('sts').get_caller_identity().get('Arn')
				# arn:aws:sts::800000000000:assumed-role/SplunkInstance_ReadOnly/...
				m = re.search(r'arn:aws:sts::(\d+):[^\/]+\/([^\/]+)', account_arn_current)
				aws_account = m.group(1)
				aws_role = m.group(2)

				sts_client = boto3.client('sts')
				role_arn = "arn:aws:iam::" + aws_account + ":role/" + aws_role
				assumed_role_object = sts_client.assume_role(
					RoleArn=role_arn,
					RoleSessionName="AssumeRoleSession" + random_number
				)

				credentials = assumed_role_object['Credentials']
				s3 = boto3.client(
					's3',
					aws_access_key_id=credentials['AccessKeyId'],
					aws_secret_access_key=credentials['SecretAccessKey'],
					aws_session_token=credentials['SessionToken'],
				)
				logger.debug("Connected using assumed role %s", role_arn)
			except BaseException as e:
				logger.critical("Could not connect to S3. Failed to assume role: " + repr(e))
				print("Could not connect to S3. Failed to assume role: " + repr(e))
				exit(7)
		else:
			logger.critical("ARN not configured and credential not specified.")
			print("ARN not configured and credential not specified.")
			exit(8)
		
		# Upload file to s3
		try:
			with open(local_output_file, "rb") as f:
				s3.upload_fileobj(f, self.bucket, self.outputfile)
			s3 = None
			sts_client = None
			logger.info("Successfully pushed events to s3. app=%s count=%s bucket=%s file=%s user=%s" % (app, event_counter, self.bucket, self.outputfile, user))
			os.remove(local_output_file)
		except s3.exceptions.NoSuchBucket as e:
			logger.critical("Error: No such bucket")
			print("Error: No such bucket")
			exit(123833)
		except BaseException as e:
			logger.critical("Could not upload file to S3: " + repr(e))
			print("Could not upload file to S3: " + repr(e))
			exit(9)
		
		

dispatch(s3ep, sys.argv, sys.stdin, sys.stdout, __name__)


