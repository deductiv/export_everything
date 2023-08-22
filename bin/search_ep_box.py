#!/usr/bin/env python

# Copyright 2023 Deductiv Inc.
# search_ep_box.py
# Export Splunk search results to Box - Search Command
#
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.3.0 (2023-08-11)

import sys
import os
import platform
import random
from deductiv_helpers import setup_logger, \
	get_conf_stanza, \
	get_conf_file, \
	replace_keywords, \
	search_console, \
	is_search_finalizing, \
	replace_object_tokens, \
	recover_parameters, \
	log_proxy_settings, \
	str2bool
from ep_helpers import get_config_from_alias, get_box_connection
import event_file

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
	search | epbox target=<target alias> 
		outputfile=<output path/filename> 
		outputformat=[json|raw|kv|csv|tsv|pipe] 
		fields="field1, field2, field3" 
		compress=[true|false]

	**Description**
	Export Splunk events to Box in any format.
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
			cmd_config = get_conf_file('ep_box')
		except BaseException as e:
			raise Exception("Could not read configuration: " + repr(e))
		
		# Facility info - prepended to log lines
		facility = os.path.basename(__file__)
		facility = os.path.splitext(facility)[0]
		logger = setup_logger(app_config["log_level"], 'export_everything.log', facility)
		ui = search_console(logger, self)
		searchinfo = self._metadata.searchinfo

		if first_chunk:
			logger.info('Box Export search command initiated')
			logger.debug('search_ep_box command: %s', self)  # logs command line
			log_proxy_settings(logger)

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

		# Create the default filename
		default_filename = ("export_%s___now__%s" % (searchinfo.username, 
					event_file.file_extensions[self.outputformat])).strip("'")

		# First run and no remote output file string has been assigned
		if not hasattr(self, 'remote_output_file'):
			if self.outputfile not in default_values:
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
				filename = default_filename

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
			setattr(self, 'local_output_file', os.path.join(searchinfo.dispatch_dir, staging_filename))
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
				ui.exit_error("Could not connect to box: " + repr(e))

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
						if subfolder_name.lower() == item.name.lower():
							logger.debug("Found Box folder_id=%s for folder=\"%s\"", str(item.id), subfolder_name)
							self.box_folder_object = client.folder(folder_id=item.id)
							folder_found = True
				if not folder_found:
					logger.debug('Folder not found. Creating %s', subfolder_name)
					# Create the required subfolder
					self.box_folder_object = self.box_folder_object.create_subfolder(subfolder_name)
			
			# Check if the target file exists
			folder_contents = self.box_folder_object.get_items()
			for item in folder_contents:
				if item.name.lower() == self.outputfile.lower():
					try:
						logger.debug("File already exists. Deleting before upload: %s/%s", folder, self.outputfile)
						item.delete()
					except BoxAPIException as be:
						ui.exit_error("File already exists: %s/%s" % folder, self.outputfile)
			
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
			for event in event_file.write_events_to_file(events, self.fields, self.local_output_file, 
						self.outputformat, self.compress, self.blankfields, self.internalfields, self.datefields, 
						append_chunk, self._finished, False, searchinfo.sid):
				yield event
				self.event_counter += 1

		except BoxAPIException as be:
			ui.exit_error(be.message)
		except BaseException as e:
			ui.exit_error("Error writing staging file to upload")

		if self._finished or self._finished is None:
			try:
				new_file = self.box_folder_object.upload(self.local_output_file, file_name=self.remote_output_file)
				logger.info("Box export_status=success, app=%s, count=%s, file_name=\"%s\", file_size=%s, file_id=%s, user=%s" % \
							(searchinfo.app, self.event_counter, new_file.name, os.stat(self.local_output_file).st_size, 
							new_file.id, searchinfo.username))
			except BoxAPIException as be:
				ui.exit_error("BoxAPIException uploading file to Box: " + be.message)
			except KeyError as e:
				ui.exit_error("KeyError uploading file to Box: " + repr(e))
			except BaseException as e:
				ui.exit_error("Error uploading file to Box: " + repr(e))
			finally:
				os.remove(self.local_output_file)

dispatch(epbox, sys.argv, sys.stdin, sys.stdout, __name__)
