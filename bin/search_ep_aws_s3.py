#!/usr/bin/env python

# Copyright 2023 Deductiv Inc.
# search_ep_aws_s3.py
# Export Splunk search results to AWS S3 - Search Command
#
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.3.0 (2023-08-11)

import sys
import os
import random
from deductiv_helpers import setup_logger, \
	get_conf_stanza, \
	get_conf_file, \
	replace_keywords, \
	search_console, \
	is_search_finalizing, \
	replace_object_tokens, \
	recover_parameters, \
	str2bool, \
	log_proxy_settings
from ep_helpers import get_config_from_alias, get_aws_connection
import event_file

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from splunklib.searchcommands import EventingCommand, dispatch, Configuration, Option, validators

# Define class and type for Splunk command
@Configuration()
class epawss3(EventingCommand):
	'''
	**Syntax:**
	search | epawss3 target=<target alias> bucket=<bucket> outputfile=<output path/filename> outputformat=[json|raw|kv|csv|tsv|pipe]

	**Description**
	Export Splunk events to AWS S3 (or compatible) over JSON or raw text.
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
	bucket = Option(require=False)
	
	# Validators found @ https://github.com/splunk/splunk-sdk-python/blob/master/splunklib/searchcommands/validators.py

	@Configuration()
	def transform(self, events):

		if getattr(self, 'first_chunk', True):
			setattr(self, 'first_chunk', False)
			first_chunk = True
		else:
			first_chunk = False
		
		try:
			app_config = get_conf_stanza('ep_general','settings')
			cmd_config = get_conf_file('ep_aws_s3')
		except BaseException as e:
			raise Exception("Could not read configuration: " + repr(e))

		# Facility info - prepended to log lines
		facility = os.path.basename(__file__)
		facility = os.path.splitext(facility)[0]
		logger = setup_logger(app_config["log_level"], 'export_everything.log', facility)
		ui = search_console(logger, self)
		searchinfo = self._metadata.searchinfo

		if first_chunk:
			logger.info('AWS S3 Export search command initiated')
			logger.debug('search_ep_aws_s3 command: %s', self)  # logs command line
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
		if self.bucket in default_values:
			if 'default_s3_bucket' in list(target_config.keys()):
				t = target_config['default_s3_bucket']
				if t is not None and len(t) > 0:
					self.bucket = t
				else:
					ui.exit_error("No bucket specified")
			else:
				ui.exit_error("No bucket specified")
		
		# If the parameters are not supplied or blank (alert actions), supply defaults
		self.outputformat = 'csv' if self.outputformat in default_values else self.outputformat
		self.fields = None if self.fields in default_values else self.fields
		self.blankfields = False if self.blankfields in default_values else self.blankfields
		self.internalfields = False if self.internalfields in default_values else self.internalfields
		self.datefields = False if self.datefields in default_values else self.datefields
		self.compress = str2bool(target_config['compress']) if self.compress in default_values else False

		# First run and no remote output file string has been assigned
		if not hasattr(self, 'remote_output_file'):
			if self.outputfile in default_values:
				# Boto is special. We need repr to give it the encoding it expects to match the hashing.
				self.outputfile = repr("export_%s___now__%s" % (searchinfo.username, 
							event_file.file_extensions[self.outputformat])).strip("'")
			
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
			
			setattr(self, 'remote_output_file', self.outputfile)
		
			# First run and no local output file string has been assigned
			# Use the random number to support running multiple outputs in a single search
			random_number = str(random.randint(10000, 100000))
			staging_filename = f"export_everything_staging_aws_s3_{random_number}.txt"
			setattr(self, 'local_output_file', os.path.join(searchinfo.dispatch_dir, staging_filename))
			if self.compress:
				self.local_output_file = self.local_output_file + '.gz'

			logger.debug(f"remote_file=\"{self.outputfile}\", " + \
				f"compression={self.compress}, " + \
				f"staging_file=\"{self.local_output_file}\"")
			
			setattr(self, 'event_counter', 0)
			append_chunk = False

			try:
				setattr(self, 's3', get_aws_connection(target_config))
			except BaseException as e:
				ui.exit_error( "Could not connect to AWS: " + repr(e))

		else:
			# Persistent variable is populated from a prior chunk/iteration.
			# Use the previous local output file and append to it.
			append_chunk = True
		
		# Write the output file to disk in the dispatch folder
		logger.debug("Writing events. file=\"%s\", format=%s, compress=%s, fields=\"%s\"", \
			self.local_output_file, self.outputformat, self.compress, \
			self.fields if self.fields is not None else "")
		for event in event_file.write_events_to_file(events, self.fields, self.local_output_file,
					self.outputformat, self.compress, self.blankfields, self.internalfields,
					self.datefields, append_chunk, self._finished, False, searchinfo.sid):
			yield event
			self.event_counter += 1
		
		# Write the data to S3 after the very last chunk has been processed
		if self._finished or self._finished is None:
			# Upload file to s3
			try:
				with open(self.local_output_file, "rb") as f:
					self.s3.upload_fileobj(f, self.bucket, self.remote_output_file)
				logger.info("S3 export_status=success, app=%s, count=%s, bucket=%s, file_name=%s, file_size=%s, user=%s" % 
							(searchinfo.app, self.event_counter, self.bucket, self.remote_output_file, 
							os.stat(self.local_output_file).st_size, searchinfo.username))
				self.s3 = None
			except self.s3.exceptions.NoSuchBucket as e:
				ui.exit_error(logger, "Error: No such bucket")
			except BaseException as e:
				ui.exit_error(logger, "Could not upload file to S3: " + repr(e))
			finally:
				os.remove(self.local_output_file)

dispatch(epawss3, sys.argv, sys.stdin, sys.stdout, __name__)


