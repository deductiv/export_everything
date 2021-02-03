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

# REST endpoint for configuration via setup.xml
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 1.1.5 (2021-02-03)

from builtins import str
from builtins import range
import logging
import sys, os, platform
import re

# Add lib folders to import path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
# pylint: disable=import-error
import splunk.admin as admin
import splunk.rest as rest
import splunk.entity as en
from splunk.clilib import cli_common as cli
from deductiv_helpers import setup_logger, eprint

# https://github.com/HurricaneLabs/splunksecrets/blob/master/splunksecrets.py
from splunksecrets import encrypt, encrypt_new

options = ['log_level', 'hec_host', 'hec_token', 'hec_port', 'hec_ssl', 
	'use_arn', 'default_s3_bucket', 'default_credential', 
	'default_folder', 'enterpriseID', 'clientID', 'clientSecret', 'publicKeyID', 'privateKey', 'passphrase']
for i in range(1, 20):
	options.append('credential' + str(i)) # credential1 through credential19

class SetupApp(admin.MConfigHandler):

	# Set up supported arguments
	def setup(self):
		facility = 'setup'
		logger = setup_logger('INFO', 'hep_setup.log', 'setup') # pylint: disable=undefined-variable
		logger.debug("Setup setup started")
		logger.debug("%s Requested action: %s", facility, (self.requestedAction))
		if self.requestedAction == admin.ACTION_EDIT:
			for arg in options:
				self.supportedArgs.addOptArg(arg)

	def handleCreate(self, confInfo):
		"""Called when user invokes the "create" action."""
		self.actionNotImplemented()

	# Read default settings
	def handleList(self, confInfo):
		facility = 'list'
		logger = setup_logger('INFO', 'hep_setup.log', 'setup') # pylint: disable=undefined-variable
		logger.info("Setup list handler started")
		#logger.debug(str(list(self.supportedArgs.items())))
		confDict = self.readConf("hep")
		if None != confDict:
			for stanza, settings in list(confDict.items()):
				for key, val in list(settings.items()):
					logger.debug("%s stanza: %s, key: %s, value: %s", facility, stanza, key, val)
					# Set blank value for each setting if one does not exist
					if key in options and val in [None, '']:
						val = ''
					confInfo[stanza].append(key, val)

	# Update settings once they are saved by the user
	def handleEdit(self, confInfo):
		facility = 'edit'
		logger = setup_logger('DEBUG', 'hep_setup.log', 'setup') # pylint: disable=undefined-variable
		logger.debug("Setup edit handler started")
		# Read the splunk.secret file
		with open(os.path.join(os.getenv('SPLUNK_HOME'), 'etc', 'auth', 'splunk.secret'), 'r') as ssfh:
			splunk_secret = ssfh.readline()

		config_id = self.callerArgs.id
		config = self.callerArgs.data
		logger.debug("%s config: %s/%s", facility, config_id, config)
		new_config = {}
		for k, v in list(config.items()):
			if isinstance(v, list) and len(v) == 1:
				v = v[0]
			if v is None:
				logger.debug('%s Setting %s to blank', facility, k)
				new_config[k] = ''
			else:
				#logger.debug('%s Setting %s to %s', facility, k, v)
				if (k[:10] == 'credential' or k == 'clientSecret' or k == 'passphrase') and not '$7$' in v:
					logger.debug('%s Value has an unencrypted password. Encrypting.', facility)
					# Split the value into alias/username/password
					#logger.debug(alias)
					#logger.debug(username)
					#logger.debug(password)
					if k[:10] == 'credential':
						try:
							alias, username, password = v.split(':')
							v = alias + ":" + username + ":" + encrypt_new(splunk_secret, password)
						except BaseException as e:
							logger.error("%s Error saving encrypted password for %s: %s", facility, alias, repr(e))
							continue
					else:
						v = encrypt_new(splunk_secret, v)
				new_config[k] = v
		logger.debug("%s Writing new config for %s: %s", facility, config_id, str(new_config))
		try:
			# Write the config stanza
			self.writeConf('hep', config_id, new_config)
		except BaseException as e:
			logger.critical("%s Error writing config: %s", facility, repr(e))
			exit(1)
	
# initialize the handler
admin.init(SetupApp, admin.CONTEXT_APP_AND_USER)
