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

# Python 3 compatible only (Does not work on Mac version of Splunk's Python)
# search_ep_box.py
# Push Splunk search results to Box - Search Command
#
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.0.0 (2021-04-26)

from __future__ import print_function
from builtins import str
from future import standard_library
standard_library.install_aliases()
import logging
import sys, os, platform
import time, datetime
import random
import re
import json
from deductiv_helpers import setup_logger, eprint, get_config_from_alias, replace_keywords, exit_error

# Add lib subfolders to import path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
# pylint: disable=import-error
from splunk.clilib import cli_common as cli
import splunk.entity as entity
import splunklib.client as client
import splunklib.results as results
from splunklib.searchcommands import ReportingCommand, dispatch, Configuration, Option, validators
import event_file

# https://github.com/HurricaneLabs/splunksecrets/blob/master/splunksecrets.py
from splunksecrets import decrypt

# Import the correct version of cryptography
# https://pypi.org/project/cryptography/
os_platform = platform.system()
py_major_ver = sys.version_info[0]

# Import the correct version of platform-specific libraries
if os_platform == 'Linux':
	if py_major_ver == 3:
		path_prepend = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib', 'py3_linux_x86_64')
	elif py_major_ver == 2:
		path_prepend = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib', 'py2_linux_x86_64')
elif os_platform == 'Darwin': # Does not work with Splunk Python3 build. It requires code signing for libs.
	if py_major_ver == 3:
		path_prepend = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib', 'py3_darwin_x86_64')
	elif py_major_ver == 2:
		path_prepend = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib', 'py2_darwin_x86_64')
elif os_platform == 'Windows':
	if py_major_ver == 3:
		path_prepend = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib', 'py3_win_amd64')
	elif py_major_ver == 2:
		path_prepend = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib', 'py2_win_amd64')

sys.path.append(path_prepend)

from boxsdk import JWTAuth, Client, BoxAPIException

def str2bool(v):
	return str(v).lower() in ("yes", "y", "true", "t", "1") or v == 1

def decrypt_with_secret(encrypted_text):
	# Check for encryption
	if encrypted_text[:1] == '$':
		# Decrypt the text
		# Read the splunk.secret file
		with open(os.path.join(os.getenv('SPLUNK_HOME'), 'etc', 'auth', 'splunk.secret'), 'r') as ssfh:
			splunk_secret = ssfh.readline()
		# Call the decrypt function from splunksecrets.py
		return decrypt(splunk_secret, encrypted_text)
	else:
		# Not encrypted
		return encrypted_text

# Define class and type for Splunk command
@Configuration()
class boxep(ReportingCommand):
	doc='''
	**Syntax:**
	search | boxep folder="<folder>" outputfile=<output filename> outputformat=[json|raw|kv|csv|tsv|pipe]

	**Description**
	Push Splunk events to Box over JSON or raw text.
	'''

	# Define Parameters
	""" 
	# Only one credential supported for this app to simplify Box app administration
	credential = Option(
		doc='''
		**Syntax:** **credential=***<Box credential>*
		**Description:** The name of the Box credential given by the admin
		**Default:** The credential defined in hep.conf, aws stanza''',
		require=False)
	"""
	target = Option(
		doc='''
		**Syntax:** **target=***<target_alias>*
		**Description:** Reference to a target Box app within the configuration
		**Default:** The target configured as "Default" within the setup page (if any)''',
		require=False)

	folder = Option(
		doc='''
		**Syntax:** **folder=***<folder name>*
		**Description:** The path of the destination folder, e.g. "/upload"
		**Default:** The folder name defined in hep.conf, box stanza''',
		require=False)

	outputfile = Option(
		doc='''
		**Syntax:** **outputfile=***<file name>*
		**Description:** The name of the file to be written to Box
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
		**Description:** Limit the fields to be written to the file
		**Default:** All (Unspecified)''',
		require=False, validate=validators.List()) 

	compress = Option(
		doc='''
		**Syntax:** **compress=***[true|false]*
		**Description:** Option to compress the output file into .gz format before writing to Box
		**Default:** The setting from the target configuration, or True if .gz is in the filename ''',
		require=False, validate=validators.Boolean())

	# Validators found @ https://github.com/splunk/splunk-sdk-python/blob/master/splunklib/searchcommands/validators.py
	
	def __getitem__(self, key):
		return getattr(self,key)
	
	def map(self, events):
		for e in events:
			yield(e)

	#define main function
	def reduce(self, events):

		try:
			app_config = cli.getConfStanza('ep_general','settings')
			cmd_config = cli.getConfStanzas('ep_box')
		except BaseException as e:
			raise Exception("Could not read configuration: " + repr(e))
		
		# Facility info - prepended to log lines
		facility = os.path.basename(__file__)
		facility = os.path.splitext(facility)[0]
		try:
			logger = setup_logger(app_config["log_level"], 'event_push.log', facility)
		except BaseException as e:
			raise Exception("Could not create logger: " + repr(e))

		logger.info('Box Event Push search command initiated')

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
		app = self._metadata.searchinfo.app
		user = self._metadata.searchinfo.username
		dispatch = self._metadata.searchinfo.dispatch_dir

		try:
			target_config = get_config_from_alias(cmd_config, self.target)
			if target_config is None:
				exit_error(logger, "Unable to find target configuration.", 100937)
			logger.debug("Target configuration: " + str(target_config))
		except BaseException as e:
			exit_error(logger, "Error reading target server configuration: " + repr(e), 124812)

		# Check to see if we have credentials
		valid_settings = []
		for l in list(target_config.keys()):
			if len(target_config[l]) > 0:
				valid_settings.append(l) 
		if 'client_id' in valid_settings and 'client_secret' in valid_settings and 'enterprise_id' in valid_settings:
			# A credential has been configured. Check for a cert.
			if 'public_key_id' in valid_settings and 'private_key' in valid_settings and 'passphrase' in valid_settings:
				# Certificate has been configured.
				try:
					enterprise_id = target_config['enterprise_id']
					client_id = target_config['client_id']
					client_secret = decrypt_with_secret(target_config['client_secret'])
					public_key_id = target_config['public_key_id']
					private_key = decrypt_with_secret(target_config['private_key']).replace('\\n', '\n')
					passphrase = decrypt_with_secret(target_config['passphrase'])

					box_authentication = {
						"enterpriseID": enterprise_id,
						"boxAppSettings": {
							"clientID": client_id,
							"clientSecret": client_secret,
							"appAuth": {
								"publicKeyID": public_key_id,
								"privateKey": private_key,
								"passphrase": passphrase
							}
						}
					}
					auth = JWTAuth.from_settings_dictionary(box_authentication)
				except BaseException as e: 
					exit_error(logger, "Could not find or decrypt the specified credential: " + repr(e), 230494)
			else:
				exit_error(logger, "Could not find required certificate settings", 2823872)
		else:
			exit_error(logger, "Could not find required configuration settings", 2823874)

		if self.folder is None:
			if 'default_folder' in list(target_config.keys()):
				t = target_config['default_folder']
				if t is not None and len(t) > 0:
					self.folder = t
				else:
					exit_error(logger, "No folder specified", 4)
			else:
				self.folder = '/'
		
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
			now = str(int(time.time()))
			self.outputfile = (app + '_' + user + '___now__' + file_extensions[self.outputformat]).strip("'")

		# Replace keywords from output filename
		self.outputfile = replace_keywords(self.outputfile)

		if self.compress:
			logger.debug('Compression: %s', self.compress)
		else:
			try:
				self.compress = target_config.get('compress')
			except:
				self.compress = False
		
		staging_filename = 'eventpush_staging.txt'
		local_output_file = os.path.join(dispatch, staging_filename)

		# Append .gz to the output file if compress=true
		if not self.compress and len(self.outputfile) > 3:
			# We have a .gz extension when compression was not specified. Enable compression.
			if self.outputfile[-3:] == '.gz':
				self.compress = True
		elif self.compress and len(self.outputfile) > 3:
			if self.outputfile[-3:] != '.gz':
				self.outputfile = self.outputfile + '.gz'

		if self.compress:
			local_output_file = local_output_file + '.gz'
		
		logger.debug("Staging file: %s" % local_output_file)

		#random_number = str(random.randint(10000, 100000))

		if auth is not None:
			
			# Use the credential to connect to Box
			try:
				client = Client(auth)

				root_folder_id = '0'
				target_folder = self.folder
				subfolders = target_folder.strip('/').split('/')
				if '' in subfolders:
					subfolders.remove('')
				logger.debug("Folders: %s" % str(subfolders))
				# Prepend the list with the root element
				folder = client.root_folder().get()
				# Walk the folder path until we find the target directory
				for subfolder_name in subfolders:
					logger.debug("Looking for folder: %s" % subfolder_name)
					# Get the folder ID for the string specified from the list of child subfolders
					# folder object is from the previous iteration
					folder_contents = folder.get_items()
					for item in folder_contents:
						if item.type == 'folder':
							#logger.debug('{0} {1} is named "{2}"'.format(item.type.capitalize(), item.id, item.name))
							if subfolder_name == item.name:
								logger.debug("Found a target folder ID: %s" % str(item.id))
								folder = client.folder(folder_id=item.id)
								folder_found = True
					if folder_found:
						folder_found = False
					else:
						# There is a problem
						exit_error(logger, "Target folder not found: %s" % target_folder, 12)

				try:
					event_counter = 0
					# Write the output file to disk in the dispatch folder
					logger.debug("Writing events to file %s in %s format. Compress=%s\n\tfields=%s", local_output_file, self.outputformat, self.compress, self.fields)
					for event in event_file.write_events_to_file(events, self.fields, local_output_file, self.outputformat, self.compress):
						yield event
						event_counter += 1

				except BoxAPIException as be:
					exit_error(logger, be.message, 833928)
				except BaseException as e:
					exit_error(logger, "Error writing file to upload")

				#yield({"Result": "Success", "File": new_file.name, "FileID": new_file.id})
			except BoxAPIException as be:
				exit_error(logger, be.message, 83)
			except BaseException as e:
				exit_error(logger, "Could not connect to Box: " + repr(e), 6)
		
			try:
				new_file = folder.upload(local_output_file, file_name=self.outputfile)
				message = "Box Event Push Status: Success. File name: %s, File ID: %s" % (new_file.name, new_file.id)
				eprint(message)
				logger.info(message)
			except BaseException as e:
				exit_error(logger, "Error uploading file to Box: " + repr(e), 109693)
		else:
			exit_error(logger, "Box credential not configured.", 8)
		

dispatch(boxep, sys.argv, sys.stdin, sys.stdout, __name__)


