#!/usr/bin/env python

# REST endpoint for configuration via setup.xml
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 1.0

import logging
import sys, os
import re
import splunk.admin as admin
import splunk.entity as en

# Add lib folder to import path
path_prepend = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib')
sys.path.append(path_prepend)
from deductiv_helpers import *

options = ['default_region','default_s3_bucket']

class ConfigApp(admin.MConfigHandler):

	# Set up supported arguments
	def setup(self):
		if self.requestedAction == admin.ACTION_EDIT:
			for arg in options:
				self.supportedArgs.addOptArg(arg)

	# Read default settings
	def handleList(self, confInfo):
		
		logger = setup_logger('INFO', 'hep_setup.log')
		logger.debug("AWS config list handler started")
		
		confDict = self.readConf("hep")
		if None != confDict:
			for stanza, settings in list(confDict.items()):
				if stanza == "aws":
					for key, val in list(settings.items()):
						logger.debug("key: {0}, value: {1}".format(key, val))
						# Set blank value for each setting if one does not exist
						if key in options and val in [None, '']:
							val = ''
						confInfo[stanza].append(key, val)

	# Update settings once they are saved by the user
	def handleEdit(self, confInfo):
		logger = setup_logger('INFO', 'hep_setup.log')
		logger.debug("AWS config edit handler started")

		config = self.callerArgs.data
		new_config = {}
		for k, v in config.items():
			if v is None or v == [None]:
				new_config[k] = ''
			else:
				new_config[k] = v
		try:
			# Write the config stanza
			self.writeConf('hep', 'aws', new_config)
		except BaseException as e:
			logger.critical("Error writing AWS config: " + repr(e))
			exit(1)
		
# initialize the handler
admin.init(ConfigApp, admin.CONTEXT_NONE)
