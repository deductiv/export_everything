#!/usr/bin/env python

# Copyright 2022 Deductiv Inc.
# search_ep_smb.py
# Export Splunk search results to a remote SMB server - Search Command
#
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.0.6 (2022-12-02)

import sys
import os
import random
import socket
from deductiv_helpers import setup_logger, eprint, exit_error, replace_object_tokens, recover_parameters, log_proxy_settings
from ep_helpers import get_config_from_alias
import event_file
from splunk.clilib import cli_common as cli

# Add lib subfolders to import path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from smb.SMBConnection import SMBConnection
from splunklib.searchcommands import EventingCommand, dispatch, Configuration, Option, validators

# Define class and type for Splunk command
@Configuration()
class epsmb(EventingCommand):
	'''
	**Syntax:**
	search | epsmb target=<target host alias> outputfile=<output path/filename> outputformat=[json|raw|kv|csv|tsv|pipe] fields="field1, field2, field3" compress=[true|false]

	**Description**
	Export Splunk events to an SMB server share in any format.
	'''

	# Define Parameters
	target = Option(
		doc='''
		**Syntax:** **target=***<target_host_alias>*
		**Description:** Reference to a target SMB share within the configuration
		**Default:** The target configured as "Default" within the setup page (if any)''',
		require=False)

	outputfile = Option(
		doc='''
		**Syntax:** **outputfile=***<file path/file name>*
		**Description:** The name of the file to be written remotely
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
		**Description:** Option to compress the output file into .gz format before uploading
		**Default:** The setting from the target configuration, or True if .gz is in the filename ''',
		require=False, validate=validators.Boolean())

	# Validators found @ https://github.com/splunk/splunk-sdk-python/blob/master/splunklib/searchcommands/validators.py
	
	@Configuration()
	def transform(self, events):

		try:
			app_config = cli.getConfStanza('ep_general','settings')
			cmd_config = cli.getConfStanzas('ep_smb')
		except BaseException as e:
			raise Exception("Could not read configuration: " + repr(e))
		
		# Facility info - prepended to log lines
		facility = os.path.basename(__file__)
		facility = os.path.splitext(facility)[0]
		try:
			logger = setup_logger(app_config["log_level"], 'export_everything.log', facility)
		except BaseException as e:
			raise Exception("Could not create logger: " + repr(e))

		logger.info('SMB Export search command initiated')
		logger.debug('search_ep_smb command: %s', self)  # logs command line
		log_proxy_settings(logger)
	
		# Enumerate settings
		app = self._metadata.searchinfo.app
		user = self._metadata.searchinfo.username
		dispatch = self._metadata.searchinfo.dispatch_dir
		session_key = self._metadata.searchinfo.session_key
		
		if self.target is None and 'target=' in str(self):
			recover_parameters(self)
		# Replace all tokenized parameter strings
		replace_object_tokens(self)

		# Use the random number to support running multiple outputs in a single search
		random_number = str(random.randint(10000, 100000))

		try:
			target_config = get_config_from_alias(session_key, cmd_config, self.target)
			if target_config is None:
				exit_error(logger, "Unable to find target configuration (%s)." % self.target, 100937)
		except BaseException as e:
			exit_error(logger, "Error reading target server configuration: " + repr(e), 124812)

		# Get the local client hostname
		client_name = socket.gethostname()
		# Delete any domain from the client hostname string
		if '.' in client_name:
			client_name = client_name[0:client_name.index('.')]
		
		# Check to see if we have credentials
		valid_settings = []
		for l in list(target_config.keys()):
			if len(target_config[l]) > 0:
				valid_settings.append(l) 
		if 'host' in valid_settings:
			# A target has been configured. Check for credentials.
			try:
				if 'credential_username' in valid_settings and 'credential_password' in valid_settings and 'share_name' in valid_settings:
					domain = target_config['credential_realm'] if 'credential_realm' in list(target_config.keys()) else target_config['host']

					try:
						# Try port 445 first
						conn = SMBConnection(target_config['credential_username'], target_config['credential_password'], client_name, 
							target_config['host'], domain=domain, use_ntlm_v2=True, 
							sign_options = SMBConnection.SIGN_WHEN_SUPPORTED, is_direct_tcp=True) 
						connected = conn.connect(target_config['host'], 445, timeout=5)

						if target_config['share_name'] not in (s.name for s in conn.listShares(timeout=10)):
							exit_error(logger, "Unable to find the specified share name on the server", 553952)
						'''
						p445_error = repr(e445)
						try:
							# Try port 139 if that didn't work
							conn = SMBConnection(target_config['credential_username'], target_config['credential_password'], client_name, 
							target_config['host'], domain=domain, use_ntlm_v2=True,
							sign_options = SMBConnection.SIGN_WHEN_SUPPORTED) 
							connected = conn.connect(target_config['host'], 139, timeout=5)
						except BaseException as e139:
							p139_error = repr(e139)
							raise Exception("Errors connecting to host: \\nPort 139: %s\\nPort 445: %s" % (p139_error, p445_error))

						conn = SMBConnection(target_config['credential_username'], target_config['credential_password'], client_name, 
							target_config['host'], domain=domain, use_ntlm_v2=True,
							sign_options = SMBConnection.SIGN_WHEN_SUPPORTED) 
						connected = conn.connect(target_config['host'], 139)
						shares = 
						share_exists = False
						for i in range(len(shares)):
							if shares[i].name == target_config['share_name']:
								share_exists = True
								break
						'''
					except BaseException as e:
						exit_error(logger, "Unable to setup SMB connection: " + repr(e), 921982)
				else:
					exit_error(logger, "Required settings not found", 101926)
			except BaseException as e: 
				exit_error(logger, "Error reading the configuration: " + repr(e), 230494)
		else:
			exit_error(logger, "Could not find required configuration settings", 2823874)
		
		file_extensions = {
			'raw':  '.log',
			'kv':   '.log',
			'pipe': '.log',
			'csv':  '.csv',
			'tsv':  '.tsv',
			'json': '.json'
		}

		# If the parameters are not supplied or blank (alert actions), supply defaults
		if self.outputformat is None or self.outputformat == "":
			self.outputformat = 'csv'
		if self.fields is not None and self.fields == "":
			self.fields = None # None = All
		
		# Create the default filename
		default_filename = ('export_' + user + '___now__' + file_extensions[self.outputformat]).strip("'")

		folder, filename = event_file.parse_outputfile(self.outputfile, default_filename, target_config)

		if self.compress is not None:
			logger.debug('Compression: %s', self.compress)
		else:
			try:
				self.compress = target_config.get('compress')
			except:
				self.compress = False
		
		staging_filename = 'export_everything_staging_' + random_number + '.txt'
		local_output_file = os.path.join(dispatch, staging_filename)
		if self.compress:
			local_output_file = local_output_file + '.gz'

		# Append .gz to the output file if compress=true
		if not self.compress and len(filename) > 3:
			if filename[-3:] == '.gz':
				# We have a .gz extension when compression was not specified. Enable compression.
				self.compress = True
		elif self.compress and len(filename) > 3:
			if filename[-3:] != '.gz':
				filename = filename + '.gz'
		
		if conn is not None:
			# Use the credential to connect to the SMB server
			try:
				# Check to see if the folder exists
				logger.debug("Checking to see if folder %s exists", folder)
				folder_attrs = conn.getAttributes(target_config['share_name'], folder, timeout=10)
			except BaseException:
				# Remote directory could not be loaded. It must not exist. Create it. 
				# Create the folders required to store the file
				subfolders = ['/'] + folder.strip('/').split('/')
				if '' in subfolders:
					subfolders.remove('')
				logger.debug("Folders list for dir creation: %s" % str(subfolders))
				current_folder = ''
				folder_depth = len(subfolders) - 1
				for i, subfolder_name in enumerate(subfolders):
					current_folder = (current_folder + '/' + subfolder_name).replace('//', '/')
					logger.debug("Current folder = " + current_folder)
					try:
						conn.getAttributes(target_config['share_name'], current_folder, timeout=10)
					except:
						conn.createDirectory(target_config['share_name'], current_folder, timeout=10)
				try:
					folder_attrs = conn.getAttributes(target_config['share_name'], folder, timeout=10)
				except BaseException as e:
					exit_error(logger, "Could not load or create remote directory: " + repr(e), 377890)
			
			# This should always be true
			if folder_attrs is not None:
				if folder_attrs.isReadOnly or not folder_attrs.isDirectory:
					exit_error(logger, "Could not access the remote directory: " + repr(e), 184772)
				else:
					try:
						event_counter = 0
						# Write the output file to disk in the dispatch folder
						logger.debug("Writing events to dispatch file. file=\"%s\" format=%s compress=%s fields=%s", local_output_file, self.outputformat, self.compress, self.fields)
						for event in event_file.write_events_to_file(events, self.fields, local_output_file, self.outputformat, self.compress):
							yield event
							event_counter += 1
					except BaseException as e:
						exit_error(logger, "Error writing file to upload: " + repr(e), 296733)
					
					# Write the file to the remote location
					try:
						with open(local_output_file, 'rb', buffering=0) as local_file:
							bytes_uploaded = conn.storeFile(target_config['share_name'], folder + '/' + filename, local_file)
					except BaseException as e:
						exit_error(logger, "Error uploading file to SMB server: " + repr(e), 109693)
			
					if bytes_uploaded > 0:
						message = "SMB Export Status: Success. File name: %s" % (folder + '/' + filename)
						eprint(message)
						logger.info(message)
					else:
						exit_error(logger, "Zero bytes uploaded", 771293)
		else:
			exit_error(logger, "Could not connect to server.", 159528)
		
dispatch(epsmb, sys.argv, sys.stdin, sys.stdout, __name__)


