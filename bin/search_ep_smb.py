#!/usr/bin/env python

# Copyright 2023 Deductiv Inc.
# search_ep_smb.py
# Export Splunk search results to a remote SMB server - Search Command
#
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.3.0 (2023-08-11)

import sys
import os
import random
import socket
from deductiv_helpers import setup_logger, \
	get_conf_stanza, \
	get_conf_file, \
	search_console, \
	is_search_finalizing, \
	replace_object_tokens, \
	recover_parameters, \
	log_proxy_settings, \
	str2bool
from ep_helpers import get_config_from_alias
import event_file

# Add lib subfolders to import path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from smb.SMBConnection import SMBConnection
from smb.base import SMBTimeout, NotReadyError, NotConnectedError
from smb.smb_structs import UnsupportedFeature, ProtocolError, OperationFailure
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

	# Common file-based target parameters
	target = Option(require=False)
	outputfile = Option(require=False)
	outputformat = Option(require=False)
	fields = Option(require=False, validate=validators.List())
	blankfields = Option(require=False, validate=validators.Boolean())
	internalfields = Option(require=False, validate=validators.Boolean())
	datefields = Option(require=False, validate=validators.Boolean())
	compress = Option(require=False, validate=validators.Boolean())
	
	@Configuration()
	def transform(self, events):
		if getattr(self, 'first_chunk', True):
			setattr(self, 'first_chunk', False)
			first_chunk = True
		else:
			first_chunk = False

		try:
			app_config = get_conf_stanza('ep_general','settings')
			cmd_config = get_conf_file('ep_smb')
		except BaseException as e:
			raise Exception("Could not read configuration: " + repr(e))
		
		# Facility info - prepended to log lines
		facility = os.path.basename(__file__)
		facility = os.path.splitext(facility)[0]
		logger = setup_logger(app_config["log_level"], 'export_everything.log', facility)
		ui = search_console(logger, self)
		searchinfo = self._metadata.searchinfo

		if first_chunk:
			logger.info('SMB Export search command initiated')
			logger.debug('search_ep_smb command: %s', self)  # logs command line
			log_proxy_settings(logger)

		# Refuse to run more chunks if the search is being terminated
		if is_search_finalizing(searchinfo.sid) and not self._finished:
			ui.exit_error("Search terminated prematurely. No data was exported.")
		
		if self.target is None and 'target=' in str(self):
			recover_parameters(self)
		# Replace all tokenized parameter strings
		replace_object_tokens(self)

		# Use the random number to support running multiple outputs in a single search
		random_number = str(random.randint(10000, 100000))

		try:
			target_config = get_config_from_alias(searchinfo.session_key, cmd_config, self.target, log=first_chunk)
			if target_config is None:
				ui.exit_error("Unable to find target configuration (%s)." % self.target)
		except BaseException as e:
			ui.exit_error("Error reading target server configuration: " + repr(e))

		# If the parameters are not supplied or blank (alert actions), supply defaults
		default_values = [None, '', '__default__', ['__default__']]
		self.outputformat = 'csv' if self.outputformat in default_values else self.outputformat
		self.fields = None if self.fields in default_values else self.fields
		self.blankfields = False if self.blankfields in default_values else self.blankfields
		self.internalfields = False if self.internalfields in default_values else self.internalfields
		self.datefields = False if self.datefields in default_values else self.datefields
		self.compress = str2bool(target_config['compress']) if self.compress in default_values else self.compress

		# First run and no remote output file string has been assigned
		if not hasattr(self, 'remote_output_file'):
			# Use the default filename if one was not specified. Parse either one into folder/file vars.
			default_filename = ("export_%s___now__%s" % (searchinfo.username, 
						event_file.file_extensions[self.outputformat])).strip("'")
			folder, filename = event_file.parse_outputfile(self.outputfile, default_filename, target_config)
			folder = folder.replace("\\", "/").replace("//", "/")
			self.outputfile = folder + '/' + filename

			# Append .gz to the output file if compress=true
			if not self.compress and self.outputfile.endswith('.gz'):
				# We have a .gz extension when compression was not specified. Enable compression.
				self.compress = True
			elif self.compress and not self.outputfile.endswith('.gz'):
				# We have compression with no gz extension. Add .gz.
				self.outputfile = self.outputfile + '.gz'
			
			setattr(self, 'remote_output_file', self.outputfile)

			# First run and no local output file string has been assigned
			# Use the random number to support running multiple outputs in a single search
			random_number = str(random.randint(10000, 100000))
			staging_filename = f"export_everything_staging_smb_{random_number}.txt"
			setattr(self, 'local_output_file', os.path.join(searchinfo.dispatch_dir, staging_filename))
			if self.compress:
				self.local_output_file = self.local_output_file + '.gz'

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
							setattr(self, 'conn', SMBConnection(target_config['credential_username'], target_config['credential_password'], client_name, 
								target_config['host'], domain=domain, use_ntlm_v2=True, 
								sign_options = SMBConnection.SIGN_WHEN_SUPPORTED, is_direct_tcp=True))
							self.conn.connect(target_config['host'], 445, timeout=5)

							if not target_config['share_name'].endswith('$') and target_config['share_name'] not in (s.name for s in self.conn.listShares(timeout=10)):
								ui.exit_error("Unable to find the specified share name on the server")
							
						except BaseException as e:
							ui.exit_error("Unable to setup SMB connection: " + repr(e))
					else:
						ui.exit_error("Required settings not found")
				except BaseException as e: 
					ui.exit_error("Error reading the configuration: " + repr(e))
			else:
				ui.exit_error("Could not find required configuration settings")

			if self.conn is not None:
				# Use the credential to connect to the SMB server
				try:
					# Check to see if the folder exists
					folder_attrs = self.conn.getAttributes(target_config['share_name'], folder, timeout=10)
				except OperationFailure:
					logger.debug(f"Failed checking for existence of folder=\"{folder}\" on share={target_config['share_name']}")
					# Remote directory could not be loaded. It must not exist. Create it. 
					# Create the folders required to store the file
					subfolders = folder.strip('/').split('/')
					if '' in subfolders:
						subfolders.remove('')
					current_folder = ''
					for i, subfolder_name in enumerate(subfolders):
						current_folder = (current_folder + '/' + subfolder_name).replace('//', '/')
						try:
							self.conn.getAttributes(target_config['share_name'], current_folder, timeout=10)
						except BaseException as e:
							logger.debug(e)
							logger.debug(f"Creating {current_folder}")
							self.conn.createDirectory(target_config['share_name'], current_folder, timeout=10)
					try:
						# Check the attributes of the newly created directory
						folder_attrs = self.conn.getAttributes(target_config['share_name'], folder, timeout=10)
					except BaseException as e:
						ui.exit_error("Could not load or create remote directory: " + repr(e))
				
					if folder_attrs.isReadOnly or not folder_attrs.isDirectory:
						ui.exit_error("Could not access the remote directory: " + repr(e))
			
			setattr(self, 'event_counter', 0)
			append_chunk = False
		else:
			# Persistent variable is populated from a prior chunk/iteration.
			# Use the previous local output file and append to it.
			append_chunk = True

		try:
			# Write the output file to disk in the dispatch folder
			logger.debug("Writing events. file=\"%s\", format=%s, compress=%s, fields=\"%s\"", self.local_output_file, self.outputformat, self.compress, self.fields)
			for event in event_file.write_events_to_file(events, self.fields, self.local_output_file, 
						self.outputformat, self.compress, self.blankfields, self.internalfields, self.datefields, 
						append_chunk, self._finished, False, searchinfo.sid):
				yield event
				self.event_counter += 1
		except BaseException as e:
			ui.exit_error("Error writing file to upload: " + repr(e))
		
		if self._finished or self._finished is None:
			# Write the file to the remote location
			try:
				with open(self.local_output_file, 'rb', buffering=0) as local_file:
					bytes_uploaded = self.conn.storeFile(target_config['share_name'], self.remote_output_file, local_file)
			except BaseException as e:
				ui.exit_error("Error uploading file to SMB server: " + repr(e))
			finally:
				os.remove(self.local_output_file)

			if bytes_uploaded > 0:
				logger.info("SMB export_status=success, app=%s, count=%s, file_name=\"%s%s\", file_size=%s, user=%s" % 
							(searchinfo.app, self.event_counter, target_config['share_name'], self.remote_output_file, 
							bytes_uploaded, searchinfo.username))
			else:
				ui.exit_error("Zero bytes uploaded")
		
dispatch(epsmb, sys.argv, sys.stdin, sys.stdout, __name__)


