#!/usr/bin/env python

# Copyright 2023 Deductiv Inc.
# search_ep_sftp.py
# Export Splunk search results to a remote SFTP server - Search Command
#
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.2.3 (2023-08-11)

import sys
import os
import platform
import random
from deductiv_helpers import setup_logger, \
	get_conf_stanza, \
	get_conf_file, \
	search_console, \
	is_search_finalizing, \
	replace_object_tokens, \
	recover_parameters, \
	log_proxy_settings, \
	str2bool
from ep_helpers import get_sftp_connection, get_config_from_alias
import event_file

# Add lib subfolders to import path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from splunklib.searchcommands import EventingCommand, dispatch, Configuration, Option, validators

# Import the correct version of cryptography
# https://pypi.org/project/cryptography/
os_platform = platform.system()
py_major_ver = sys.version_info[0]

# Import the correct version of platform-specific libraries
if os_platform == 'Linux':
	path_prepend = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib', 'py3_linux_x86_64')
elif os_platform == 'Darwin': # Does not work with Splunk Python build. It requires code signing for libs.
	path_prepend = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib', 'py3_darwin_x86_64')
elif os_platform == 'Windows':
	path_prepend = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib', 'py3_win_amd64')
sys.path.append(path_prepend)

# Define class and type for Splunk command
@Configuration()
class epsftp(EventingCommand):
	'''
	**Syntax:**
	search | epsftp target=<target host alias> outputfile=<output path/filename> outputformat=[json|raw|kv|csv|tsv|pipe] fields="field1, field2, field3" compress=[true|false]

	**Description**
	Export Splunk events to an SFTP server in any format.
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
			cmd_config = get_conf_file('ep_sftp')
		except BaseException as e:
			raise Exception("Could not read configuration: " + repr(e))
		
		# Facility info - prepended to log lines
		facility = os.path.basename(__file__)
		facility = os.path.splitext(facility)[0]
		logger = setup_logger(app_config["log_level"], 'export_everything.log', facility)
		ui = search_console(logger, self)
		searchinfo = self._metadata.searchinfo
		
		if first_chunk:
			logger.info('SFTP Export search command initiated')
			logger.debug('search_ep_sftp command: %s', self)  # logs command line
			log_proxy_settings(logger)
	
		#os.chdir(searchinfo.dispatch_dir)

		# Refuse to run more chunks if the search is being terminated
		if is_search_finalizing(searchinfo.sid) and not self._finished:
			ui.exit_error("Search terminated prematurely. No data was exported.")
		
		if self.target is None and 'target=' in str(self):
			recover_parameters(self)
		# Replace all tokenized parameter strings
		replace_object_tokens(self)

		try:
			target_config = get_config_from_alias(searchinfo.session_key, cmd_config, self.target, log=first_chunk)
			if target_config is None:
				ui.exit_error("Unable to find target configuration (%s)." % self.target)
		except BaseException as e:
			ui.exit_error("Error reading target server configuration: " + repr(e))

		# If the parameters are not supplied or blank (alert actions), supply defaults
		default_values = [None, '', '__default__', '*', ['*']]
		self.outputformat = 'csv' if self.outputformat in default_values else self.outputformat
		self.fields = None if self.fields in default_values else self.fields
		self.blankfields = False if self.blankfields in default_values else self.blankfields
		self.internalfields = False if self.internalfields in default_values else self.internalfields
		self.datefields = False if self.datefields in default_values else self.datefields
		self.compress = str2bool(target_config['compress']) if self.compress in default_values else False

		# First run and no remote output file string has been assigned
		if not hasattr(self, 'remote_output_file'):
			# Use the default filename if one was not specified. Parse either one into folder/file vars.
			default_filename = ("export_%s___now__%s" % (searchinfo.username, 
						event_file.file_extensions[self.outputformat])).strip("'")
			folder, filename = event_file.parse_outputfile(self.outputfile, default_filename, target_config)
			self.outputfile = folder + '/' + filename

			# Append .gz to the output file if compress=true
			if not self.compress and self.outputfile.endswith('.gz'):
				# We have a .gz extension when compression was not specified. Enable compression.
				self.compress = True
			elif self.compress and not self.outputfile.endswith('.gz'):
				# We have compression with no gz extension. Add .gz.
				self.outputfile = self.outputfile + '.gz'
				filename = filename + '.gz'
			
			setattr(self, 'remote_output_file', filename)

			# First run and no local output file string has been assigned
			# Use the random number to support running multiple outputs in a single search
			random_number = str(random.randint(10000, 100000))
			staging_filename = f"export_everything_staging_sftp_{random_number}.txt"
			setattr(self, 'local_output_file', os.path.join(searchinfo.dispatch_dir, staging_filename))
			if self.compress:
				self.local_output_file = self.local_output_file + '.gz'

			try:
				setattr(self, 'sftp', get_sftp_connection(target_config))
			except BaseException as e:
				ui.exit_error(repr(e))
			
			if self.sftp is not None:
				# Use the credential to connect to the SFTP server
				try:
					self.sftp.makedirs(folder)
					self.sftp.chdir(folder)
				except BaseException as e:
					ui.exit_error("Could not load remote SFTP directory: " + repr(e))
			else:
				ui.exit_error("SFTP credential not configured.")
			
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
			ui.exit_error("Error writing staging file to upload")
	
		if self._finished or self._finished is None:
			try:
				# Upload the file
				self.sftp.put(self.local_output_file)
				os.remove(self.local_output_file)
			except BaseException as e:
				ui.exit_error("Error uploading file to SFTP server: " + repr(e))

			try:
				contents = self.sftp.listdir()
				if self.remote_output_file in contents:
					file_exists = True
				else:
					file_exists = False
				# Rename the file
				if file_exists:
					self.sftp.remove(self.remote_output_file)
				# Rename the file in the current remote working directory
				self.sftp.rename(self.local_output_file.split('/')[-1], self.remote_output_file)

				if self.remote_output_file in self.sftp.listdir():
					rfilename = self.sftp.getcwd() + '/' + self.remote_output_file
					logger.info("SFTP export_status=success, app=%s, count=%s, file_name=\"%s\", file_size=%s, user=%s" % 
		 				(searchinfo.app, self.event_counter, rfilename, os.stat(self.local_output_file).st_size, searchinfo.username))
				else:
					ui.exit_error("Could not verify uploaded file exists")
			except BaseException as e:
				ui.exit_error("Error renaming or replacing file on SFTP server. Does the file already exist?" + repr(e))

dispatch(epsftp, sys.argv, sys.stdin, sys.stdout, __name__)
