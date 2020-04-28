#!/usr/bin/env python

# REST endpoint for configuration via setup.xml
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 1.0

import splunk.admin as admin
import splunk.entity as en
import logging
import os
import re

# Add lib folder to import path
path_prepend = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib')
sys.path.append(path_prepend)
from deductiv_helpers import *

options = ['hec_host', 'hec_token', 's3_default_region']

class ConfigApp(admin.MConfigHandler):

	# Set up supported arguments
	def setup(self):
		if self.requestedAction == admin.ACTION_EDIT:
			for arg in options:
				self.supportedArgs.addOptArg(arg)

	# Read default settings
	def handleList(self, confInfo):
		
		logger = setup_logging('hep')
		logger.setLevel(logging.DEBUG)
		logger.debug('Settings handler started')
		
		confDict = self.readConf("hep")
		if None != confDict:
			for stanza, settings in list(confDict.items()):
				for key, val in list(settings.items()):
					logger.debug("key: {0}, value: {1}".format(key, val))
					# Set blank value for each setting if one does not exist
					if key in options and val in [None, '']:
						val = ''
					confInfo[stanza].append(key, val)

	# Update settings once they are saved by the user
	def handleEdit(self, confInfo):
		name = self.callerArgs.id
		args = self.callerArgs

		#if self.callerArgs.data['test'][0] in [None, '']:
		#	self.callerArgs.data['test'][0] = ''
	
		# Write the config stanza
		self.writeConf('hep', 'hec', self.callerArgs.data)
		
# initialize the handler
admin.init(ConfigApp, admin.CONTEXT_NONE)
