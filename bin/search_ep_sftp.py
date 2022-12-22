#!/usr/bin/env python

# Copyright 2022 Deductiv Inc.
# search_ep_sftp.py
# Export Splunk search results to a remote SFTP server - Search Command
#
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.1.0 (2022-12-02)

import sys
import os
import platform
import random
from deductiv_helpers import setup_logger, \
	exit_error, \
	replace_object_tokens, \
	recover_parameters, \
	log_proxy_settings, \
	str2bool
from ep_helpers import get_sftp_connection, get_config_from_alias
import event_file
from splunk.clilib import cli_common as cli

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

	# Define Parameters
	target = Option(
		doc='''
		**Syntax:** **target=***<target_host_alias>*
		**Description:** Reference to a target SFTP server within the configuration
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
		if getattr(self, 'first_chunk', True):
			setattr(self, 'first_chunk', False)
			first_chunk = True
		else:
			first_chunk = False

		try:
			app_config = cli.getConfStanza('ep_general','settings')
			cmd_config = cli.getConfStanzas('ep_sftp')
		except BaseException as e:
			raise Exception("Could not read configuration: " + repr(e))
		
		# Facility info - prepended to log lines
		facility = os.path.basename(__file__)
		facility = os.path.splitext(facility)[0]
		try:
			logger = setup_logger(app_config["log_level"], 'export_everything.log', facility)
		except BaseException as e:
			raise Exception("Could not create logger: " + repr(e))

		if first_chunk:
			logger.info('SFTP Export search command initiated')
			logger.debug('search_ep_sftp command: %s', self)  # logs command line
			log_proxy_settings(logger)
	
		# Enumerate settings
		app = self._metadata.searchinfo.app
		user = self._metadata.searchinfo.username
		dispatch = self._metadata.searchinfo.dispatch_dir
		os.chdir(dispatch)
		session_key = self._metadata.searchinfo.session_key
		
		if self.target is None and 'target=' in str(self):
			recover_parameters(self)
		# Replace all tokenized parameter strings
		replace_object_tokens(self)

		try:
			target_config = get_config_from_alias(session_key, cmd_config, self.target, log=first_chunk)
			if target_config is None:
				exit_error(logger, "Unable to find target configuration (%s)." % self.target, 100937)
		except BaseException as e:
			exit_error(logger, "Error reading target server configuration: " + repr(e), 124812)

		# If the parameters are not supplied or blank (alert actions), supply defaults
		self.outputformat = 'csv' if (self.outputformat is None or self.outputformat == "") else self.outputformat
		self.fields = None if (self.fields is not None and self.fields == "") else self.fields

		# Read the compress value from the target config unless one was specified in the search
		if self.compress is None:
			try:
				self.compress = str2bool(target_config['compress'])
			except:
				self.compress = False
		
		# First run and no remote output file string has been assigned
		if not hasattr(self, 'remote_output_file'):
			# Use the default filename if one was not specified. Parse either one into folder/file vars.
			default_filename = ('export_' + user + '___now__' + event_file.file_extensions[self.outputformat]).strip("'")
			folder, filename = event_file.parse_outputfile(self.outputfile, default_filename, target_config)
			setattr(self, 'remote_output_file', filename)

			# Append .gz to the output file if compress=true
			if not self.compress and self.outputfile.endswith('.gz'):
				# We have a .gz extension when compression was not specified. Enable compression.
				self.compress = True
			elif self.compress and not self.outputfile.endswith('.gz'):
				# We have compression with no gz extension. Add .gz.
				self.outputfile = self.outputfile + '.gz'
			
			# First run and no local output file string has been assigned
			# Use the random number to support running multiple outputs in a single search
			random_number = str(random.randint(10000, 100000))
			staging_filename = f"export_everything_staging_sftp_{random_number}.txt"
			setattr(self, 'local_output_file', os.path.join(dispatch, staging_filename))
			if self.compress:
				self.local_output_file = self.local_output_file + '.gz'

			try:
				setattr(self, 'sftp', get_sftp_connection(target_config))
			except BaseException as e:
				exit_error(logger, repr(e), 912934)
			
			if self.sftp is not None:
				# Use the credential to connect to the SFTP server
				try:
					self.sftp.makedirs(folder)
					self.sftp.chdir(folder)
				except BaseException as e:
					exit_error(logger, "Could not load remote SFTP directory: " + repr(e), 6)
			else:
				exit_error(logger, "SFTP credential not configured.", 8)
			
			setattr(self, 'event_counter', 0)
			append_chunk = False
		else:
			# Persistent variable is populated from a prior chunk/iteration.
			# Use the previous local output file and append to it.
			append_chunk = True

		try:
			# Write the output file to disk in the dispatch folder
			logger.debug("Writing events. file=\"%s\", format=%s, compress=%s, fields=\"%s\"", self.local_output_file, self.outputformat, self.compress, self.fields)
			for event in event_file.write_events_to_file(events, self.fields, self.local_output_file, self.outputformat, self.compress, append_chunk=append_chunk, finish=self._finished):
				yield event
				self.event_counter += 1
		except BaseException as e:
			exit_error(logger, "Error writing staging file to upload", 296733)
	
		if self._finished or self._finished is None:
			try:
				# Upload the file
				self.sftp.put(self.local_output_file)
				os.remove(self.local_output_file)
			except BaseException as e:
				exit_error(logger, "Error uploading file to SFTP server: " + repr(e), 109693)

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
					message = "SFTP export_status=success, count=%s, file_name=\"%s\"" % (self.event_counter, self.sftp.getcwd() + '/' + self.remote_output_file)
					logger.info(message)
				else:
					exit_error(logger, "Could not verify uploaded file exists", 771293)
			except BaseException as e:
				exit_error(logger, "Error renaming or replacing file on SFTP server. Does the file already exist?" + repr(e), 109693)

dispatch(epsftp, sys.argv, sys.stdin, sys.stdout, __name__)
