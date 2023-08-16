#!/usr/bin/env python

# Copyright 2023 Deductiv Inc.
# REST endpoint for configuration
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.2.3 (2023-08-11)

import sys
import os
import re
from deductiv_helpers import setup_logger, str2bool, is_cloud
import splunk.admin as admin
import splunk.entity as en

# Add lib folders to import path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from splunksecrets import encrypt_new # https://github.com/HurricaneLabs/splunksecrets/blob/master/splunksecrets.py
import splunklib.client as client

def convert_dict_to_kvpairs(d):
	l = [(key + "=" + (value if not ' ' in value else '"'+value+'"')) if key not in ['default', 'stanza'] and value not in [None, ''] else '' for key, value in list(d.items())]
	while '' in l:
		l.remove('')
	return ', '.join(l)

class SetupApp(admin.MConfigHandler):

	def __init__(self, mode, context, log_level, config_file, options, encrypt_options=[], cloud_options={}):
		super().__init__(mode, context)
		self.context = context
		self.config_file = config_file
		self.options = options
		self.encrypt_options = encrypt_options
		self.cloud_options = cloud_options

		self.session_key = self.getSessionKey()
		self.running_on_splunk_cloud = is_cloud(self.session_key)
		facility = config_file + "_setup"
		self.logger = setup_logger(log_level, self.appName+"_setup.log", facility)

		if not self.running_on_splunk_cloud:
			# Read the splunk.secret file
			with open(os.path.join(os.getenv('SPLUNK_HOME'), 'etc', 'auth', 'splunk.secret'), 'r') as ssfh:
				self.splunk_secret = ssfh.readline()

	# Set up supported arguments
	def setup(self):
		try:
			if self.requestedAction == admin.ACTION_EDIT: # ACTION_EDIT == 4
				for arg in self.options:
					self.supportedArgs.addOptArg(arg)
		except BaseException as e:
			self.logger.exception(e)

	def handleCreate(self, confInfo):
		"""Called when user invokes the "create" action."""
		op = "CREATE" # Log prefix
		self.logger.debug(f"{op} setup handler started")
		return self.saveConf(confInfo, verify_exists=False)

	# Read default settings
	def handleList(self, confInfo):
		confDict = self.readConf(self.config_file)
		credentials = {}
		op = "LIST" # Log prefix
		self.logger.debug(f"{op} setup handler started")

		try:
			
			entity = en.getEntity('/server',
			   'settings',
			   namespace='-',
			   sessionKey=self.session_key, 
			   owner='-')
			splunkd_port = entity["mgmtHostPort"]
			service = client.connect(token=self.session_key, port=splunkd_port)

			# Get all credentials for this app
			storage_passwords = service.storage_passwords

			for credential in storage_passwords:
				if credential.access.app == self.appName:
					credentials[credential._state.title] = {
						'username': credential.content.get('username'),
						'password': credential.content.get('clear_password'),
						'realm':    credential.content.get('realm')
					}

		except BaseException as e:
			self.logger.exception('Could not connect to service: %s' % e)
			raise(e)

		if None != confDict:
			for stanza, settings in list(confDict.items()):
				if stanza != 'default':
					for k, v in list(settings.items()):
						if not self.running_on_splunk_cloud:
							# Encrypt encrypt_options values, but not in Splunk Cloud
							if k.lower() in self.encrypt_options and v is not None and len(v) > 0 and not '$7$' in v:
								v = encrypt_new(self.splunk_secret, v)
						elif self.running_on_splunk_cloud and k in list(self.cloud_options.keys()):
							# Value is defined
							# Value is not blank
							# Value is not the default string or boolean value in cloud options
							if v is not None and len(str(v))>0 and str(v)!=str(self.cloud_options[k]) and str2bool(v)!=str2bool(str(self.cloud_options[k])):
								self.logger.info(f"{op} Overriding setting {stanza}/{k} from {v} to {self.cloud_options[k]} per Splunk Cloud policy (read).")
							v = self.cloud_options[k]
						
						confInfo[stanza].append(k, v)

					self.logger.debug(f"{op} stanza={stanza} " + convert_dict_to_kvpairs(confInfo[stanza]))

	# Update settings once they are saved by the user
	def handleEdit(self, confInfo):
		config_id = self.callerArgs.id
		config = self.callerArgs.data
		op = "EDIT"
		self.logger.debug(f"{op} setup handler started for config={self.config_file}/{config_id}/{config}")

		new_config = {}
		for k, v in list(config.items()):
			try:
				if isinstance(v, list) and len(v) == 1:
					v = v[0]
				# Dynamic stanza name - GUIDs only
				guid_pattern = r'^([0-9A-Fa-f]{8}[-][0-9A-Fa-f]{4}[-][0-9A-Fa-f]{4}[-][0-9A-Fa-f]{4}[-][0-9A-Fa-f]{12})$'
				if k == 'stanza' and re.match(guid_pattern, str(v)):
					config_id = v
					self.logger.debug(f"{op} Setting stanza to {v}")
				else:
					if k in list(self.cloud_options.keys()) and self.running_on_splunk_cloud:
						# Value is defined
						# Value is not blank
						# Value is not the default string or boolean value in cloud options
						if v is not None and len(str(v))>0 and str(v)!=str(self.cloud_options[k]) and str2bool(v)!=str2bool(str(self.cloud_options[k])):
							self.logger.info(f"{op} Overriding setting {config_id}/{k} from {v} to {self.cloud_options[k]} per Splunk Cloud policy (write).")
						v = self.cloud_options[k]
					
					if v is None:
						self.logger.debug(f'{op} Setting {k} to blank')
						new_config[k] = ''
					else:
						# Encrypt the value if the setting is specified in encrypt_options
						if not self.running_on_splunk_cloud and k.lower() in self.encrypt_options and not '$7$' in v:
							self.logger.debug(f'{op} Value has an unencrypted password. Encrypting.')
							try:
								v = encrypt_new(self.splunk_secret, v)
							except BaseException as e:
								self.logger.error(f"{op} Error saving encrypted password for {v}: %s" % repr(e))
								continue
						new_config[k] = v
			except BaseException as e:
				self.logger.exception("Error parsing config value \"%s\": %s" % (v, repr(e)))
				
		new_config_kvpairs = convert_dict_to_kvpairs(new_config)
		self.logger.debug(f"{op} Writing new config for {self.config_file}/{config_id}: {new_config_kvpairs}")
		try:
			## Write the configuration via REST API
			self.writeConf(self.config_file, config_id, new_config)
		except BaseException as e:
			self.logger.exception("{op} Error writing config: %s", e)
	
	# Update settings once they are saved by the user
	def handleRemove(self, confInfo):
		op = "DELETE"
		config_id = self.callerArgs.id
		self.logger.debug(f"{op} setup handler started for config={self.config_file}/{config_id}")

		try:
			en.deleteEntity('/configs/conf-' + self.config_file, 
						self.callerArgs.id, 
						namespace=self.appName,
						owner=self.userName,
						sessionKey=self.getSessionKey())
		except BaseException as e:
			self.logger.exception(e)
