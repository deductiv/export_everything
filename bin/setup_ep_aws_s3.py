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
# Version: 2.0 (2021-04-05)

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

options = ['stanza', 'default', 'alias', 'default_s3_bucket', 
	'use_arn', 'access_key_id', 'secret_key', 'endpoint_url', 'compression']

# Read the splunk.secret file
with open(os.path.join(os.getenv('SPLUNK_HOME'), 'etc', 'auth', 'splunk.secret'), 'r') as ssfh:
	splunk_secret = ssfh.readline()

class SetupApp(admin.MConfigHandler):

	# Set up supported arguments
	def setup(self):
		facility = 'ep_aws_s3_setup'
		logger = setup_logger('DEBUG', 'event_push_setup.log', facility) # pylint: disable=undefined-variable
		logger.debug("AWS S3 setup script started")
		
		try:
			if self.requestedAction == admin.ACTION_EDIT: # ACTION_EDIT == 4
				for arg in options:
					self.supportedArgs.addOptArg(arg)
		except BaseException as e: 
			logger.exception(e)

	def handleCreate(self, confInfo):
		"""Called when user invokes the "create" action."""
		return self.saveConf(confInfo, verify_exists=False)

	# Read default settings
	def handleList(self, confInfo):
		facility = 'ep_aws_s3_list'
		logger = setup_logger('INFO', 'event_push_setup.log', facility) # pylint: disable=undefined-variable
		logger.info("AWS S3 list handler started")
		config_file="ep_aws_s3"

		confDict = self.readConf(config_file)

		if None != confDict:
			for stanza, settings in list(confDict.items()):
				for k, v in list(settings.items()):
					if stanza != 'default':
						logger.debug("%s stanza: %s, key: %s, value: %s", facility, stanza, k, v)
						# Set blank value for each setting if one does not exist
						if k in options and v in [None, '']:
							v = ''
						else:
							if ('secret' in k.lower() or 'passphrase' in k.lower()) and not '$7$' in v:
								v = encrypt_new(splunk_secret, v)
						confInfo[stanza].append(k, v)

	# Update settings once they are saved by the user
	def handleEdit(self, confInfo):
		facility = 'ep_aws_s3_edit'
		logger = setup_logger('DEBUG', 'event_push_setup.log', facility) # pylint: disable=undefined-variable
		logger.debug("AWS S3 edit handler started")
		config_file = 'ep_aws_s3'
		config_id = self.callerArgs.id
		config = self.callerArgs.data
		logger.debug("Config: %s/%s" % (config_id, config))

		new_config = {}
		for k, v in list(config.items()):
			try:
				if isinstance(v, list) and len(v) == 1:
					v = v[0]
				# Dynamic stanza name - GUIDs only
				guid_pattern = r'^([0-9A-Fa-f]{8}[-][0-9A-Fa-f]{4}[-][0-9A-Fa-f]{4}[-][0-9A-Fa-f]{4}[-][0-9A-Fa-f]{12})$'
				if k == 'stanza' and re.match(guid_pattern, str(v)):
					config_id = v
					logger.debug("Setting stanza to %s" % v)
				else:
					if v is None:
						logger.debug('%s Setting %s to blank', facility, k)
						new_config[k] = ''
					else:
						#logger.debug('%s Setting %s to %s', facility, k, v)
						if ('secret' in k.lower() or 'passphrase' in k.lower()) and not '$7$' in v:
							logger.debug('%s Value has an unencrypted password. Encrypting.', facility)
							try:
								v = encrypt_new(splunk_secret, v)
							except BaseException as e:
								logger.error("%s Error saving encrypted password for %s: %s", facility, v, repr(e))
								continue
						new_config[k] = v
			except BaseException as e:
				logger.exception("Error parsing config value \"%s\": %s" % (v, repr(e)))
				
		logger.debug("%s Writing new config for %s: %s", facility, config_id, str(new_config))
		try:
			# Write the config stanza
			self.writeConf(config_file, config_id, new_config)
		except BaseException as e:
			logger.critical("%s Error writing config: %s", facility, repr(e))
			exit(1)
	
	# Update settings once they are saved by the user
	def handleRemove(self, confInfo):
		facility = 'ep_aws_s3_delete'
		logger = setup_logger('DEBUG', 'event_push_setup.log', facility) # pylint: disable=undefined-variable
		logger.debug("AWS S3 delete handler started")

		config_id = self.callerArgs.id
		logger.debug("Config: %s" % config_id)
		try:
			en.deleteEntity('/configs/conf-ep_aws_s3', 
						self.callerArgs.id, 
						namespace=self.appName,
						owner=self.userName,
						sessionKey=self.getSessionKey())
		except BaseException as e:
			logger.exception(e)
		
# initialize the handler
admin.init(SetupApp, admin.CONTEXT_APP_AND_USER)
