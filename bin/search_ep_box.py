#!/usr/bin/env python

# Copyright 2022 Deductiv Inc.
# search_ep_box.py
# Export Splunk search results to Box - Search Command
#
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.1.0 (2022-12-02)

import sys
import os
import platform
import random
from deductiv_helpers import setup_logger, \
	replace_keywords, \
	exit_error, \
	replace_object_tokens, \
	recover_parameters, \
	log_proxy_settings, \
	str2bool
from ep_helpers import get_config_from_alias, get_box_connection
import event_file
from splunk.clilib import cli_common as cli

# Add lib subfolders to import path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
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

from boxsdk import BoxAPIException

# Define class and type for Splunk command
@Configuration()
class epbox(EventingCommand):
	'''
	**Syntax:**
	search | epbox target=<target alias> outputfile=<output path/filename> outputformat=[json|raw|kv|csv|tsv|pipe] fields="field1, field2, field3" compress=[true|false]

	**Description**
	Export Splunk events to Box in any format.
	'''

	# Define Parameters
	target = Option(
		doc='''
		**Syntax:** **target=***<target alias>*
		**Description:** Reference to a target Box app within the configuration
		**Default:** The target configured as "Default" within the setup page (if any)''',
		require=False)

	outputfile = Option(
		doc='''
		**Syntax:** **outputfile=***<file path/file name>*
		**Description:** The name of the file to be written to Box
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
			cmd_config = cli.getConfStanzas('ep_box')
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
			logger.info('Box Export search command initiated')
			logger.debug('search_ep_box command: %s', self)  # logs command line
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

		# Create the default filename
		default_filename = ('export_' + user + '___now__' + event_file.file_extensions[self.outputformat]).strip("'")

		# First run and no remote output file string has been assigned
		if not hasattr(self, 'remote_output_file'):
			if self.outputfile is not None and len(self.outputfile) > 0:
				# Split the output into folder and filename
				folder_list = self.outputfile.split('/')
				if len(folder_list) == 1:
					# No folder specified, use the default
					use_default_folder = True
					filename = folder_list[0]
					folder_list = []
				elif folder_list[0] == '':
					# Length > 1, outputfile points to the root folder (leading /)
					use_default_folder = False
				else:
					# Length > 1 and outputfile points to a relative path (no leading /)
					use_default_folder = True

				if len(folder_list) > 1 and folder_list[-1] == '':
					# No filename provided, trailing /
					filename = default_filename
					folder_list.pop()
				elif len(folder_list) > 1 and len(folder_list[-1]) > 0:
					filename = folder_list[-1]
					folder_list.pop()
			else:
				# No output file specified
				use_default_folder = True
				folder_list = []
				# Boto is special. We need repr to give it the encoding it expects to match the hashing.
				self.outputfile = default_filename

			if use_default_folder:
				if 'default_folder' in list(target_config.keys()):
					# Use the configured default folder
					folder_list = target_config['default_folder'].strip('/').split('/') + folder_list
				else:
					# Use the root folder
					folder_list = ['']
			
			# Replace keywords from output filename and folder
			folder = replace_keywords('/'.join(folder_list))
			self.outputfile = replace_keywords(filename)

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
			staging_filename = f"export_everything_staging_box_{random_number}.txt"
			setattr(self, 'local_output_file', os.path.join(dispatch, staging_filename))
			if self.compress:
				self.local_output_file = self.local_output_file + '.gz'
			logger.debug(f"remote_folder=\"{folder}\", " + \
				f"remote_file=\"{self.outputfile}\", " + \
				f"compression={self.compress}, " + \
				f"staging_file=\"{self.local_output_file}\"")
			
			# Use the credential to connect to Box
			try:
				client = get_box_connection(target_config)
			except BaseException as e:
				exit_error(logger, "Could not connect to box: " + repr(e))

			subfolders = folder.strip('/').split('/')
			if '' in subfolders:
				subfolders.remove('')
			# Prepend the list with the root element
			setattr(self, 'box_folder_object', client.root_folder().get())
			# Walk the folder path until we find the target directory
			for subfolder_name in subfolders:
				# Get the folder ID for the string specified from the list of child subfolders
				# folder object is from the previous iteration
				folder_contents = self.box_folder_object.get_items()
				folder_found = False
				for item in folder_contents:
					if item.type == 'folder':
						#logger.debug('{0} {1} is named "{2}"'.format(item.type.capitalize(), item.id, item.name))
						if subfolder_name == item.name:
							logger.debug("Found Box folder_id=%s for folder=\"%s\"" % (str(item.id), subfolder_name))
							self.box_folder_object = client.folder(folder_id=item.id)
							folder_found = True
				if not folder_found:
					# Create the required subfolder
					self.box_folder_object = self.box_folder_object.create_subfolder(subfolder_name)
			
			setattr(self, 'event_counter', 0)
			append_chunk = False
		else:
			# Persistent variable is populated from a prior chunk/iteration.
			# Use the previous local output file and append to it.
			append_chunk = True

		try:
			# Write the output file to disk in the dispatch folder
			logger.debug("Writing events. file=\"%s\", format=%s, compress=%s, fields=\"%s\"", \
				self.local_output_file, self.outputformat, self.compress, \
				self.fields if self.fields is not None else "")
			for event in event_file.write_events_to_file(events, self.fields, self.local_output_file, self.outputformat, self.compress, append_chunk=append_chunk, finish=self._finished):
				yield event
				self.event_counter += 1

		except BoxAPIException as be:
			exit_error(logger, be.message, 833928)
		except BaseException as e:
			exit_error(logger, "Error writing staging file to upload", 398372)

		if self._finished or self._finished is None:
			try:
				new_file = self.box_folder_object.upload(self.local_output_file, file_name=self.remote_output_file)
				message = "Box export_status=success, count=%s, file=\"%s\", file_id=%s" % (str(self.event_counter), new_file.name, new_file.id)
				logger.info(message)
				os.remove(self.local_output_file)
			except BaseException as e:
				exit_error(logger, "Error uploading file to Box: " + repr(e), 109693)

dispatch(epbox, sys.argv, sys.stdin, sys.stdout, __name__)
