#!/usr/bin/env python

# Copyright 2022 Deductiv Inc.
# REST endpoint for configuration
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.1.0 (2022-12-02)

from deductiv_helpers import setup_logger, str2bool, is_cloud
import splunk.admin as admin
from splunk.clilib import cli_common as cli

options = ['stanza', 'log_level']
cloud_options = {}

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
		session_key = self.getSessionKey()
		running_on_splunk_cloud = is_cloud(session_key)


		confDict = self.readConf(config_file)

		if None != confDict:
			for stanza, settings in list(confDict.items()):
				for k, v in list(settings.items()):
					logger.debug("%s stanza: %s, key: %s, value: %s", facility, stanza, k, v)
					# Set blank value for each setting if one does not exist
					if v is None:
						v = ''
					
					if k in list(cloud_options.keys()) and running_on_splunk_cloud:
						# Value is defined
						# Value is not blank
						# Value is not the default string or boolean value in cloud options
						if v is not None and len(str(v))>0 and str(v)!=str(cloud_options[k]) and str2bool(v)!=str2bool(str(cloud_options[k])):
							logger.info(f"Overriding setting {stanza}/{k} from {v} to {cloud_options[k]} per Splunk Cloud policy (read).")
						v = cloud_options[k]
					
					confInfo[stanza].append(k, v)

	# Update settings once they are saved by the user
	def handleEdit(self, confInfo):
		facility = config_file + '_edit'
		logger = setup_logger(app_config["log_level"], setup_log, facility)
		logger.debug("Setup edit handler started")

		config_id = self.callerArgs.id
		config = self.callerArgs.data
		logger.debug("Config: %s/%s" % (config_id, config))
		running_on_splunk_cloud = is_cloud(self.getSessionKey())

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
					if k in list(cloud_options.keys()) and running_on_splunk_cloud:
						# Value is defined
						# Value is not blank
						# Value is not the default string or boolean value in cloud options
						if v is not None and len(str(v))>0 and str(v)!=str(cloud_options[k]) and str2bool(v)!=str2bool(str(cloud_options[k])):
							logger.info(f"Overriding setting {config_id}/{k} from {v} to {cloud_options[k]} per Splunk Cloud policy (write).")
						v = cloud_options[k]
					
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
			self.writeConf(config_file, config_id, new_config)
		except BaseException as e:
			logger.critical("%s Error writing config: %s", facility, repr(e))
			exit(1)
	
# initialize the handler
admin.init(SetupApp, admin.CONTEXT_APP_AND_USER)
