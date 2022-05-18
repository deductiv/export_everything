#!/usr/bin/env python

# Copyright 2022 Deductiv Inc.
# search_ep_box.py
# Export Splunk search results to Box - Search Command
#
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.0.5 (2022-04-25)

import sys
import os
import platform
import time
import random
from deductiv_helpers import setup_logger, eprint, replace_keywords, exit_error, replace_object_tokens, recover_parameters, log_proxy_settings
from ep_helpers import get_config_from_alias, get_box_connection
import event_file
from splunk.clilib import cli_common as cli

# Add lib subfolders to import path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from splunklib.searchcommands import ReportingCommand, dispatch, Configuration, Option, validators

# Import the correct version of cryptography
# https://pypi.org/project/cryptography/
os_platform = platform.system()
py_major_ver = sys.version_info[0]

# Import the correct version of platform-specific libraries
if os_platform == 'Linux':
	if py_major_ver == 3:
		path_prepend = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib', 'py3_linux_x86_64')
elif os_platform == 'Darwin': # Does not work with Splunk Python3 build. It requires code signing for libs.
	if py_major_ver == 3:
		path_prepend = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib', 'py3_darwin_x86_64')
elif os_platform == 'Windows':
	if py_major_ver == 3:
		path_prepend = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib', 'py3_win_amd64')
sys.path.append(path_prepend)

from boxsdk import BoxAPIException

# Define class and type for Splunk command
@Configuration()
class epbox(ReportingCommand):
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
	def map(self, events):
		for e in events:
			yield(e)

	#define main function
	def reduce(self, events):

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
			target_config = get_config_from_alias(session_key, cmd_config, self.target)
			if target_config is None:
				exit_error(logger, "Unable to find target configuration (%s)." % self.target, 100937)
			logger.debug("Target configuration: " + str(target_config))
		except BaseException as e:
			exit_error(logger, "Error reading target server configuration: " + repr(e), 124812)
		
		file_extensions = {
			'raw':  '.log',
			'kv':   '.log',
			'pipe': '.log',
			'csv':  '.csv',
			'tsv':  '.tsv',
			'json': '.json'
		}

		if self.outputformat is None:
			self.outputformat = 'csv'

		# Create the default filename
		now = str(int(time.time()))
		default_filename = ('export_' + user + '___now__' + file_extensions[self.outputformat]).strip("'")

		# Split the output into folder and filename
		if self.outputfile is not None:
			folder_list = self.outputfile.split('/')
			if len(folder_list) == 1:
				# No folder specified, use the default
				use_default_folder = True
				filename = folder_list[0]
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
			use_default_folder = True
			filename = default_filename
			folder_list = []
		
		if use_default_folder:
			if 'default_folder' in list(target_config.keys()):
				# Use the configured default folder
				folder_list = target_config['default_folder'].strip('/').split('/') + folder_list
			else:
				# Use the root folder
				folder_list = ['']
		
		# Replace keywords from output filename and folder
		folder = replace_keywords('/'.join(folder_list))
		filename = replace_keywords(filename)
		logger.debug("Folder = " + folder)
		logger.debug("Filename = " + filename)
		
		if self.compress is not None:
			logger.debug('Compression: %s', self.compress)
		else:
			try:
				self.compress = target_config.get('compress')
			except:
				self.compress = False
		
		# Use the random number to support running multiple outputs in a single search
		random_number = str(random.randint(10000, 100000))
		staging_filename = 'export_everything_staging_' + random_number + '.txt'
		local_output_file = os.path.join(dispatch, staging_filename)
		if self.compress:
			local_output_file = local_output_file + '.gz'
		logger.debug("Staging file: %s" % local_output_file)

		# Append .gz to the output file if compress=true
		if not self.compress and len(filename) > 3:
			if filename[-3:] == '.gz':
				# We have a .gz extension when compression was not specified. Enable compression.
				self.compress = True
		elif self.compress and len(filename) > 3:
			if filename[-3:] != '.gz':
				filename = filename + '.gz'
		
		#if auth is not None:
			
		# Use the credential to connect to Box
		try:
			client = get_box_connection(target_config)
		except BaseException as e:
			exit_error(logger, "Could not connect to box: " + repr(e))

		subfolders = folder.strip('/').split('/')
		if '' in subfolders:
			subfolders.remove('')
		logger.debug("Folders: %s" % str(subfolders))
		# Prepend the list with the root element
		box_folder_object = client.root_folder().get()
		# Walk the folder path until we find the target directory
		for subfolder_name in subfolders:
			logger.debug("Looking for folder: %s" % subfolder_name)
			# Get the folder ID for the string specified from the list of child subfolders
			# folder object is from the previous iteration
			folder_contents = box_folder_object.get_items()
			folder_found = False
			for item in folder_contents:
				if item.type == 'folder':
					#logger.debug('{0} {1} is named "{2}"'.format(item.type.capitalize(), item.id, item.name))
					if subfolder_name == item.name:
						logger.debug("Found a target folder ID: %s" % str(item.id))
						box_folder_object = client.folder(folder_id=item.id)
						folder_found = True
			if not folder_found:
				# Create the required subfolder
				box_folder_object = box_folder_object.create_subfolder(subfolder_name)

		try:
			event_counter = 0
			# Write the output file to disk in the dispatch folder
			logger.debug("Writing events to dispatch file. file=\"%s\" format=%s compress=%s fields=%s", local_output_file, self.outputformat, self.compress, self.fields)
			for event in event_file.write_events_to_file(events, self.fields, local_output_file, self.outputformat, self.compress):
				yield event
				event_counter += 1

		except BoxAPIException as be:
			exit_error(logger, be.message, 833928)
		except BaseException as e:
			exit_error(logger, "Error writing file to upload", 398372)

		try:
			new_file = box_folder_object.upload(local_output_file, file_name=filename)
			message = "Box Export Status: Success. File name: %s, File ID: %s" % (new_file.name, new_file.id)
			eprint(message)
			logger.info(message)
		except BaseException as e:
			exit_error(logger, "Error uploading file to Box: " + repr(e), 109693)		

dispatch(epbox, sys.argv, sys.stdin, sys.stdout, __name__)


