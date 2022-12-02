# Export Everything App for Splunk
# Handle directory listing requests for configured targets
# Version: 2.0.6 (2022-12-02)

import sys
import os
import re
import json
from splunk.clilib import cli_common as cli
import splunk.entity as en
import splunk.rest

# Add lib subfolders to import path
sys.path.append(os.path.dirname(os.path.abspath(__file__))) # Special for REST endpoints
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from deductiv_helpers import setup_logger
from ep_helpers import get_config_from_alias, get_aws_s3_directory, get_box_directory, get_sftp_directory, get_smb_directory
import splunklib.client as client


config = cli.getConfStanza('ep_general','settings')
# Facility info - prepended to log lines
facility = os.path.basename(__file__)
facility = os.path.splitext(facility)[0]
logger = setup_logger(config["log_level"], 'export_everything.log', facility)
temp_dir = os.path.join(os.environ.get('SPLUNK_HOME'), 'etc','users','splunk-system-user','.eptemp')
os.makedirs(temp_dir, exist_ok=True)
os.chdir(temp_dir)

app = 'export_everything'

def return_error(error_text):
	error_text = re.sub(r'Exception\(|\\|\'|"', '', error_text)
	error_text = re.sub(r'\(+', '(', error_text)
	error_text = re.sub(r'\)+', ')', error_text)
	return {'error': error_text, 
		'payload': error_text,
		'status': 500}

def get_directory_contents(config_file, config, query):
	# Use config_file to decide which method to call
	try:
		if config_file == 'ep_aws_s3':
			return get_aws_s3_directory(config, query['folder'])
		elif config_file == 'ep_box':
			return get_box_directory(config, query['folder'])
		elif config_file == 'ep_sftp':
			return get_sftp_directory(config, query['folder'])
		elif config_file == 'ep_smb':
			return get_smb_directory(config, query['folder'])
			
	except BaseException as e:
		logger.exception("Could not get directory listing: " + repr(e))
		raise Exception(repr(e))

#class RemoteDirectoryListingHandler(PersistentServerConnectionApplication):
class RemoteDirectoryListingHandler(splunk.rest.BaseRestHandler):	
	#def __init__(self, command_line, command_arg):
	#	#super(PersistentServerConnectionApplication, self).__init__()	# pylint: disable=bad-super-call
	#	#PersistentServerConnectionApplication.__init__(self)
	#	pass

	def __init__(self, method, requestInfo, responseInfo, sessionKey):
		splunk.rest.BaseRestHandler.__init__(self, method, requestInfo, responseInfo, sessionKey)

	# Handle a synchronous from splunkd.
	#def handle(self, in_string):
	def handle_GET(self):
		"""
		Called for a simple synchronous request.
		@param in_string: request data passed in
		@rtype: string or dict
		@return: String to return in response.  If a dict was passed in,
				it will automatically be JSON encoded before being returned.
		"""

		logger.debug('Started REST directory listing process')
		#input = json.loads(in_string)
		#input = self.args
		session_key = self.sessionKey
		entity = en.getEntity('/server',
			'settings',
			namespace='-',
			sessionKey=session_key,
			owner='-')
		splunkd_port = entity["mgmtHostPort"]
		try:

			service = client.connect(token=session_key, port=splunkd_port)
			# Get all credentials in the secret store for this app
			credentials = {}
			storage_passwords = service.storage_passwords
			for credential in storage_passwords:
				if credential.access.app == app:
					credentials[credential._state.title] = {
						'username': credential.content.get('username'),
						'password': credential.content.get('clear_password'),
						'realm':    credential.content.get('realm')
					}
			
			config = {
				"general": cli.getConfStanza('ep_general','settings')
			}
			configurations = ["ep_aws_s3", "ep_box", "ep_sftp", "ep_smb"]
			for c in configurations:
				config[c] = cli.getConfStanzas(c)
				for stanza in list(config[c].keys()):
					for k, v in list(config[c][stanza].items()):
						if 'credential' in k:
							if v in list(credentials.keys()):
								config[c][stanza][k + '_username'] = credentials[v]['username']
								config[c][stanza][k + '_realm'] = credentials[v]['realm']
								config[c][stanza][k + '_password'] = credentials[v]['password']
		
		except BaseException as e:
			logger.error("Could not read configuration: " + repr(e))
			raise Exception("Could not read configuration: " + repr(e))
		
		logger.debug("Received connection from src_ip=%s user=%s" % (self.request['remoteAddr'], self.request['userId']))
		# Check for permissions

		if "query" in list(self.request.keys()):
			query = {}
			#logger.debug('input query = ' + str(input['query']))
			if isinstance(self.request['query'], list):
				for i in self.request.query:
					query[i[0]] = i[1]
			elif isinstance(self.request['query'], dict):
				query = self.request['query']
			logger.debug('query = ' + str(query))

			if "config" in list(query.keys()) and "alias" in list(query.keys()):
				config_file = query['config']
				entry_alias = query['alias']
			else: 
				return_error("Invalid query")

			try:
				datasource_config = get_config_from_alias(session_key, config[config_file], entry_alias)
			except BaseException as e:
				return return_error("Could not get config: %s" % repr(e))

			if datasource_config is not None:
				# Set the defaults
				if 'folder' not in list(query.keys()) or len(query['folder']) == 0:
					logger.debug("Folder is blank or 0 length")
					# AWS specific - set the default bucket
					if 'default_s3_bucket' in list(datasource_config.keys()):
						query['folder'] = '/' + datasource_config['default_s3_bucket']
					else:
						query['folder'] = ''
					if 'default_folder' in list(datasource_config.keys()):
						query['folder'] = (query['folder'] + '/' + datasource_config['default_folder']).replace('//', '/')
				try:
					payload = get_directory_contents(config_file, datasource_config, query)
					try:
						payload = json.dumps(payload)
					except BaseException as e:
						return return_error("Could not convert payload to JSON: %s" % repr(e))
					return [{
						"payload": payload,
						"status": 200
					}]
				except BaseException as e:
					return return_error(repr(e))
			else:
				return return_error("Cannot find the specified configuration")
		else:
			return return_error("No query supplied")

