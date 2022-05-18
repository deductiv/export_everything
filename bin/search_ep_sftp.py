#!/usr/bin/env python

# Copyright 2022 Deductiv Inc.
# search_ep_sftp.py
# Export Splunk search results to a remote SFTP server - Search Command
#
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.0.5 (2022-04-25)

import sys
import os
import platform
import random
from deductiv_helpers import setup_logger, eprint, exit_error, replace_object_tokens, recover_parameters, log_proxy_settings
from ep_helpers import get_sftp_connection, get_config_from_alias
import event_file
from splunk.clilib import cli_common as cli

# Add lib subfolders to import path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
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

# Define class and type for Splunk command
@Configuration()
class epsftp(ReportingCommand):
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
	def map(self, events):
		for e in events:
			yield(e)

	#define main function
	def reduce(self, events):

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

		# Use the random number to support running multiple outputs in a single search
		random_number = str(random.randint(10000, 100000))

		try:
			target_config = get_config_from_alias(session_key, cmd_config, self.target)
			if target_config is None:
				exit_error(logger, "Unable to find target configuration (%s)." % self.target, 100937)
			#logger.debug("Target configuration: " + str(target_config))
		except BaseException as e:
			exit_error(logger, "Error reading target server configuration: " + repr(e), 124812)

		try:
			sftp = get_sftp_connection(target_config)
		except BaseException as e:
			exit_error(logger, repr(e), 912934)
		
		'''
		# Check to see if we have credentials
		valid_settings = []
		for l in list(target_config.keys()):
			if target_config[l][0] == '$':
				target_config[l] = decrypt_with_secret(target_config[l]).strip()
			if len(target_config[l]) > 0:
				#logger.debug("l.strip() = [" + target_config[l].strip() + "]")
				valid_settings.append(l) 
		if 'host' in valid_settings and 'port' in valid_settings:
			# A target has been configured. Check for credentials.
			# Disable SSH host checking (fix later - set as an option? !!!)
			cnopts = pysftp.CnOpts()
			cnopts.hostkeys = None
			try:
				if 'username' in valid_settings and 'password' in valid_settings:
					try:
						sftp = pysftp.Connection(host=target_config['host'], username=target_config['username'], password=target_config['password'], cnopts=cnopts)
					except BaseException as e:
						exit_error(logger, "Unable to setup SFTP connection with password: " + repr(e), 921982)
				elif 'username' in valid_settings and 'private_key' in valid_settings:
					# Write the decrypted private key to a temporary file
					key_file = os.path.join(dispatch, 'epsftp_private_key_' + random_number)
					private_key = target_config['private_key'].replace('\\n', '\n')
					with open(key_file, "w") as f:
						f.write(private_key)
						f.close()
					try:
						if 'passphrase' in valid_settings:
							sftp = pysftp.Connection(host=target_config['host'], private_key=key_file, private_key_pass=target_config['passphrase'], cnopts=cnopts)
						else:
							sftp = pysftp.Connection(host=target_config['host'], username=target_config['username'], private_key=key_file, cnopts=cnopts)
					except BaseException as e:
						exit_error(logger, "Unable to setup SFTP connection with private key: " + repr(e), 921982)
				else:
					exit_error(logger, "Required settings not found", 101926)
			except BaseException as e: 
				exit_error(logger, "Could not find or decrypt the specified credential: " + repr(e), 230494)
		else:
			exit_error(logger, "Could not find required configuration settings", 2823874)
		'''

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
		#now = str(int(time.time()))
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
		
		if sftp is not None:
			# Use the credential to connect to the SFTP server
			try:
				sftp.makedirs(folder)
				sftp.chdir(folder)
			except BaseException as e:
				exit_error(logger, "Could not load remote SFTP directory: " + repr(e), 6)

			contents = sftp.listdir()
			if filename in contents:
				file_exists = True
			else:
				file_exists = False
			
			try:
				event_counter = 0
				# Write the output file to disk in the dispatch folder
				logger.debug("Writing events to dispatch file. file=\"%s\" format=%s compress=%s fields=%s", local_output_file, self.outputformat, self.compress, self.fields)
				for event in event_file.write_events_to_file(events, self.fields, local_output_file, self.outputformat, self.compress):
					yield event
					event_counter += 1
			except BaseException as e:
				exit_error(logger, "Error writing file to upload", 296733)
		
			try:
				# Upload the file
				sftp.put(local_output_file)
			except BaseException as e:
				exit_error(logger, "Error uploading file to SFTP server: " + repr(e), 109693)

			try:
				# Rename the file
				if file_exists:
					sftp.remove(filename)
				remote_staging_filename = folder + '/' + local_output_file.split('/')[-1]
				remote_target_filename = folder + '/' + filename
				sftp.rename(remote_staging_filename, remote_target_filename)

				if filename in sftp.listdir():
					message = "SFTP Export Status: Success. File name: %s" % (folder + '/' + filename)
					eprint(message)
					logger.info(message)
				else:
					exit_error(logger, "Could not verify uploaded file exists", 771293)
			except BaseException as e:
				exit_error(logger, "Error renaming or replacing file on SFTP server. Does the file already exist?" + repr(e), 109693)
		else:
			exit_error(logger, "Credential not configured.", 8)
		

dispatch(epsftp, sys.argv, sys.stdin, sys.stdout, __name__)


