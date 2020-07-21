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
# Version: 1.0

from builtins import str
from builtins import range
import logging
import sys, os, platform
import re

# Add lib folder to import path
path_prepend = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib')
sys.path.append(path_prepend)
import splunk.admin as admin 		# pylint: disable=import-error
import splunk.entity as en 			# pylint: disable=import-error
from deductiv_helpers import * 		# pylint: disable=import-error

########									########
########  Start import code for decryption  ########
########									########

# Import the correct version of cryptography
# https://pypi.org/project/cryptography/
os_platform = platform.system()
py_major_ver = sys.version_info[0]

# Import the correct version
if os_platform == 'Linux':
	if py_major_ver == 3:
		path_prepend = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib', 'py3_linux_x86_64')
	elif py_major_ver == 2:
		path_prepend = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib', 'py2_linux_x86_64')
elif os_platform == 'Darwin':
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
import cryptography
# https://github.com/HurricaneLabs/splunksecrets/blob/master/splunksecrets.py
from splunksecrets import encrypt, encrypt_new

########									########
########  End import code for decryption    ########
########									########

options = ['hec_host', 'hec_token', 'hec_port', 'hec_ssl', 
	'use_arn', 'default_s3_bucket', 'default_credential']
for i in range(1, 20):
	options.append('credential' + str(i)) # credential1 through credential19

class SetupApp(admin.MConfigHandler):

	# Set up supported arguments
	def setup(self):
		facility = 'setup'
		logger = setup_logger('INFO', 'hep_setup.log') # pylint: disable=undefined-variable
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
		logger = setup_logger('DEBUG', 'hep_setup.log') # pylint: disable=undefined-variable
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
		logger = setup_logger('DEBUG', 'hep_setup.log') # pylint: disable=undefined-variable
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
				logger.debug('%s Setting %s to %s', facility, k, v)
				if k[:10] == 'credential' and not '$7$' in v:
					logger.debug('%s Value has an unencrypted password: %s', facility, v)
					# Split the value into alias/username/password
					alias, username, password = v.split(':')
					logger.debug(alias)
					logger.debug(username)
					logger.debug(password)
					# salt = disk-encryption
					v = alias + ":" + username + ":" + encrypt_new(splunk_secret, password)
				new_config[k] = v
		try:
			# Write the config stanza
			self.writeConf('hep', config_id, new_config)
		except BaseException as e:
			logger.critical("%s Error writing config: %s", facility, repr(e))
			exit(1)
	
# initialize the handler
admin.init(SetupApp, admin.CONTEXT_APP_AND_USER)
