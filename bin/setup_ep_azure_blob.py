#!/usr/bin/env python

# Copyright 2022 Deductiv Inc.
# REST endpoint for configuration
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.1.0 (2022-12-02)

import sys
import os
import re
from deductiv_helpers import setup_logger, str2bool, is_cloud
import splunk.admin as admin
import splunk.entity as en
from splunk.clilib import cli_common as cli

# Add lib folders to import path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
# https://github.com/HurricaneLabs/splunksecrets/blob/master/splunksecrets.py
from splunksecrets import encrypt_new
import splunklib.client as client

options = ['stanza', 'default', 'alias', 'default_container', 'credential', 'compress', 
	'storage_account', 'azure_ad', 'azure_ad_authority', 'type']
password_options = []
cloud_options = {}

app = 'export_everything'
app_config = cli.getConfStanza('ep_general', 'settings')
setup_log = app + '_setup.log'
config_file = 'ep_azure_blob'

# Read the splunk.secret file
with open(os.path.join(os.getenv('SPLUNK_HOME'), 'etc', 'auth', 'splunk.secret'), 'r') as ssfh:
	splunk_secret = ssfh.readline()

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
		confDict = self.readConf(config_file)
		credentials = {}
		logger.info(config_file + " list handler started")
		session_key = self.getSessionKey()
		running_on_splunk_cloud = is_cloud(session_key)

		try:
			entity = en.getEntity('/server',
			   'settings',
			   namespace='-',
			   sessionKey=session_key, 
			   owner='-')
			splunkd_port = entity["mgmtHostPort"]
			service = client.connect(token=session_key, port=splunkd_port)

			# Get all credentials for this app
			storage_passwords = service.storage_passwords

			for credential in storage_passwords:
				if credential.access.app == app:
					credentials[credential._state.title] = {
						'username': credential.content.get('username'),
						'password': credential.content.get('clear_password'),
						'realm':    credential.content.get('realm')
					}

		except BaseException as e:
			logger.exception('Could not connect to service: %s' % e)
			raise(e)

		if None != confDict:
			for stanza, settings in list(confDict.items()):
				for k, v in list(settings.items()):
					if stanza != 'default':
						logger.debug("%s stanza: %s, key: %s, value: %s", facility, stanza, k, v)
						if k.lower() in password_options and v is not None and len(v) > 0 and not '$7$' in v:
							v = encrypt_new(splunk_secret, v)
						
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
		logger.debug(config_file + " edit handler started")
		config_id = self.callerArgs.id
		config = self.callerArgs.data
		logger.debug("Config: %s/%s" % (config_id, config))
		running_on_splunk_cloud = is_cloud(self.getSessionKey())

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
						#logger.debug('%s Setting %s to %s', facility, k, v)
						if k.lower() in password_options and not '$7$' in v:
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
			## Write the configuration via REST API
			self.writeConf(config_file, config_id, new_config)
		except BaseException as e:
			logger.exception("%s Error writing config: %s", facility, e)
	
	# Update settings once they are saved by the user
	def handleRemove(self, confInfo):
		facility = config_file + '_delete'
		logger = setup_logger(app_config["log_level"], setup_log, facility)
		logger.debug(config_file + " delete handler started")

		config_id = self.callerArgs.id
		logger.debug("Config: %s" % config_id)
		try:
			en.deleteEntity('/configs/conf-' + config_file, 
						self.callerArgs.id, 
						namespace=self.appName,
						owner=self.userName,
						sessionKey=self.getSessionKey())
		except BaseException as e:
			logger.exception(e)
		
# initialize the handler
admin.init(SetupApp, admin.CONTEXT_APP_AND_USER)
