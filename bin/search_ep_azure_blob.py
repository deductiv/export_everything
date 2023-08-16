#!/usr/bin/env python

# Copyright 2023 Deductiv Inc.
# search_ep_azure_blob.py
# Export Splunk search results to Azure Blob - Search Command
#
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.2.3 (2023-08-11)

import sys
import os
import random
from deductiv_helpers import setup_logger, \
	replace_keywords, \
	search_console, \
	is_search_finalizing, \
	replace_object_tokens, \
	recover_parameters, \
	str2bool, \
	log_proxy_settings
from ep_helpers import get_config_from_alias, get_azureblob_client, upload_azureblob_file
import event_file
from splunk.clilib import cli_common as cli

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from splunklib.searchcommands import EventingCommand, dispatch, Configuration, Option, validators
#from azure.storage.blob import ContainerClient

# Define class and type for Splunk command
@Configuration()
class epazureblob(EventingCommand):
	'''
	**Syntax:**
	search | epazureblob target=<target alias> container=<container> outputfile=<output path/filename> outputformat=[json|raw|kv|csv|tsv|pipe]

	**Description**
	Export Splunk events to Azure Blob over JSON or raw text.
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

	# Command-specific parameters
	container = Option(require=False)
	append = Option(require=False)
	
	@Configuration()
	def transform(self, events):
		if getattr(self, 'first_chunk', True):
			setattr(self, 'first_chunk', False)
			first_chunk = True
		else:
			first_chunk = False
		
		try:
			app_config = cli.getConfStanza('ep_general','settings')
			cmd_config = cli.getConfStanzas('ep_azure_blob')
		except BaseException as e:
			raise Exception("Could not read configuration: " + repr(e))
		
		# Facility info - prepended to log lines
		facility = os.path.basename(__file__)
		facility = os.path.splitext(facility)[0]
		logger = setup_logger(app_config["log_level"], 'export_everything.log', facility)
		ui = search_console(logger, self)
		searchinfo = self._metadata.searchinfo

		if first_chunk:
			logger.info('Azure Blob Export search command initiated')
			logger.debug('search_ep_azure_blob command: %s', self)  # logs command line
			log_proxy_settings(logger)

		# Refuse to run more chunks if the search is being terminated
		if is_search_finalizing(searchinfo.sid) and not self._finished:
			ui.exit_error("Search terminated prematurely. No data was exported.")
		
		if self.target is None and 'target=' in str(self):
			recover_parameters(self)
		# Replace all tokenized parameter strings
		replace_object_tokens(self)

		# Build the configuration
		try:
			target_config = get_config_from_alias(searchinfo.session_key, cmd_config, stanza_guid_alias=self.target, log=first_chunk)
			if target_config is None:
				ui.exit_error("Unable to find target configuration (%s)." % self.target)
		except BaseException as e:
			ui.exit_error("Error reading target server configuration: " + repr(e))
		
		default_values = [None, '', '__default__', '*', ['*']]
		if self.container in default_values:
			if 'default_container' in list(target_config.keys()):
				t = target_config['default_container']
				if t is not None and len(t) > 0:
					self.container = t
					#target_config["container"] = t
				else:
					ui.exit_error("No container specified (status=error)")
			else:
				ui.exit_error("No container specified (status=error)")

		# If the parameters are not supplied or blank (alert actions), supply defaults
		self.outputformat = 'csv' if self.outputformat in default_values else self.outputformat
		self.fields = None if self.fields in default_values else self.fields
		self.blankfields = False if self.blankfields in default_values else self.blankfields
		self.internalfields = False if self.internalfields in default_values else self.internalfields
		self.datefields = False if self.datefields in default_values else self.datefields
		self.compress = str2bool(target_config['compress']) if self.compress in default_values else False
		self.append = False if self.append in default_values else self.append

		# First run and no remote output file string has been assigned
		if not hasattr(self, 'remote_output_file'):
			if self.outputfile in default_values:
				self.outputfile = "export_%s___now__%s" % (searchinfo.username, 
						    event_file.file_extensions[self.outputformat]).strip("'")
			
			# Replace keywords from output filename
			self.outputfile = replace_keywords(self.outputfile)
			self.outputfile = self.outputfile.lstrip('/')

			# Append .gz to the output file if compress=true
			if not self.compress and self.outputfile.endswith('.gz'):
				# We have a .gz extension when compression was not specified. Enable compression.
				self.compress = True
			elif self.compress and not self.outputfile.endswith('.gz'):
				# We have compression with no gz extension. Add .gz.
				self.outputfile = self.outputfile + '.gz'
			
			if self.append and self.compress:
				ui.exit_error("Cannot append to gzip blob. (status=error)")

			setattr(self, 'remote_output_file', self.outputfile)
		
			# First run and no local output file string has been assigned
			# Use the random number to support running multiple outputs in a single search
			random_number = str(random.randint(10000, 100000))
			staging_filename = f"export_everything_staging_azure_blob_{random_number}.txt"
			setattr(self, 'local_output_file', os.path.join(searchinfo.dispatch_dir, staging_filename))
			if self.compress:
				self.local_output_file = self.local_output_file + '.gz'

			logger.debug(f"remote_file=\"{self.outputfile}\", " + \
				f"compression={self.compress}, " + \
				f"staging_file=\"{self.local_output_file}\"")
			
			setattr(self, 'event_counter', 0)
			append_chunk = False

			try:
				self.azure_client = get_azureblob_client(target_config)
			except BaseException as e:
				ui.exit_error("Could not connect to Azure Blob: " + repr(e))
				
		else:
			# Persistent variable is populated from a prior chunk/iteration.
			# Use the previous local output file and append to it.
			append_chunk = True
		
		# Write the output file to disk in the dispatch folder
		logger.debug("Writing events. file=\"%s\", format=%s, compress=%s, fields=\"%s\"", \
			self.local_output_file, self.outputformat, self.compress, \
			self.fields if self.fields is not None else "")
		for event in event_file.write_events_to_file(events, self.fields, self.local_output_file, self.outputformat, 
					self.compress, self.blankfields, self.internalfields, self.datefields, append_chunk, \
					self._finished, self.append, searchinfo.sid):
			yield event
			self.event_counter += 1
		
		# Upload the data after the very last chunk has been processed
		if self._finished or self._finished is None:
			try:
				upload_azureblob_file(self.azure_client, self.container, self.local_output_file, self.remote_output_file, self.append)
				logger.info("Azure Blob export_status=success, app=%s, count=%s, container=%s, file_name=%s, user=%s" % 
					(searchinfo.app, self.event_counter, self.container, self.remote_output_file, searchinfo.username))
			except BaseException as e:
				ui.exit_error("Could not upload file to Azure Blob (status=failure): " + repr(e))

dispatch(epazureblob, sys.argv, sys.stdin, sys.stdout, __name__)


