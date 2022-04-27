#!/usr/bin/env python

# Copyright 2022 Deductiv Inc.
# REST endpoint for configuration
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.0.5 (2022-04-25)

from deductiv_helpers import setup_logger
import splunk.admin as admin
import splunk.entity as en
from splunk.clilib import cli_common as cli

options = ['stanza', 'log_level']

app = 'export_everything'
app_config = cli.getConfStanza('ep_general', 'settings')
setup_log = app + '_setup.log'
config_file = 'ep_general'

class SetupApp(admin.MConfigHandler):

	# Set up supported arguments
	def setup(self):
		facility = config_file + '_setup'
		logger = setup_logger(app_config["log_level"], setup_log, facility)
		logger.debug("Setup script started")
		
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
		facility = config_file + '_list'
		logger = setup_logger(app_config["log_level"], setup_log, facility)
		logger.info("Setup list handler started")

		confDict = self.readConf(config_file)

		if None != confDict:
			for stanza, settings in list(confDict.items()):
				for k, v in list(settings.items()):
					logger.debug("%s stanza: %s, key: %s, value: %s", facility, stanza, k, v)
					# Set blank value for each setting if one does not exist
					if v is None:
						v = ''
					confInfo[stanza].append(k, v)

	# Update settings once they are saved by the user
	def handleEdit(self, confInfo):
		facility = config_file + '_edit'
		logger = setup_logger(app_config["log_level"], setup_log, facility)
		logger.debug("Setup edit handler started")

		config_id = self.callerArgs.id
		config = self.callerArgs.data
		logger.debug("Config: %s/%s" % (config_id, config))

		new_config = {}
		for k, v in list(config.items()):
			try:
				if isinstance(v, list) and len(v) == 1:
					v = v[0]
				logger.debug(v)
				if k == 'stanza':
					logger.debug("Setting stanza to %s" % v)
					config_id = v
				else:
					if v is None:
						logger.debug('%s Setting %s to blank', facility, k)
						new_config[k] = ''
					else:
						new_config[k] = v
			except BaseException as e:
				logger.exception("Error parsing config value \"%s\": %s" % (v, repr(e)))
		logger.debug("%s Writing new config for %s: %s", facility, config_id, str(new_config))
		try:
			## Write the configuration via REST API
			# Add the field values to an entity object
			entity = en.getEntity('configs/conf-' + config_file,
			   config_id,
			   namespace=app,
			   owner='nobody',
			   sessionKey=self.getSessionKey()
			)
			for k, v in list(new_config.items()):
				entity.__setitem__(k, v)
			# Apply the entity object to the configuration
			en.setEntity(entity, sessionKey=self.getSessionKey())
		except BaseException as e:
			logger.critical("%s Error writing config: %s", facility, repr(e))
			exit(1)
	
# initialize the handler
admin.init(SetupApp, admin.CONTEXT_APP_AND_USER)
