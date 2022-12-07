#!/usr/bin/env python

# Copyright 2022 Deductiv Inc.
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.1.0 (2022-12-02)

import random
import sys
import os
import platform
import re
import socket
import stat
from datetime import datetime
from deductiv_helpers import setup_logger, str2bool, decrypt_with_secret, exit_error, merge_two_dicts
from splunk.clilib import cli_common as cli
import splunk.entity as en

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
import splunklib.client as client

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

app = 'export_everything'

# Enumerate proxy settings
http_proxy = os.environ.get('HTTP_PROXY')
https_proxy = os.environ.get('HTTPS_PROXY')
proxy_exceptions = os.environ.get('NO_PROXY')

random_number = str(random.randint(10000, 100000))

config = cli.getConfStanza('ep_general','settings')
# Facility info - prepended to log lines
facility = os.path.basename(__file__)
facility = os.path.splitext(facility)[0]
logger = setup_logger(config["log_level"], 'export_everything.log', facility)

def mask_obj_passwords(obj):
	if isinstance(obj, dict):
		r = {}
		for key, value in list(obj.items()):
			if isinstance(value, dict):
				r[key] = mask_obj_passwords(value)
			elif isinstance(key, str) and ('passphrase' in key or 'password' in key or 'private' in key and not 'passphrase_credential' in key):
				r[key] = "********"
			else:
				r[key] = value
		return r
	else:
		return obj
'''
def mask_obj_passwords(o):
	no_passwords = {}
	for k, v in list(o.items()):
		if 'password' in k or '' in k:
			no_passwords[k] = '********'
		else:
			no_passwords[k] = v
	return no_passwords
'''
def get_config_from_alias(session_key, config_data, stanza_guid_alias=None, log=True):
	credentials = {}
	# Get all credentials for this app 
	try:
		entity = en.getEntity('/server',
			'settings',
			namespace='-',
			sessionKey=session_key,
			owner='-')
		splunkd_port = entity["mgmtHostPort"]
		service = client.connect(token=session_key, port=splunkd_port)
		# Get all credentials in the secret store for this app
		storage_passwords = service.storage_passwords
		for credential in storage_passwords:
			if credential.access.app == app:
				credentials[credential._state.title] = {
					'username': credential.content.get('username'),
					'password': credential.content.get('clear_password'),
					'realm':    credential.content.get('realm')
				}
		
	except BaseException as e:
		raise Exception("Could not access secret store: " + repr(e))
	
	# Parse and merge the configuration
	try:
		for guid in list(config_data.keys()):
			for setting, setting_value in list(config_data[guid].items()):
				# Delete blank configuration values (in case setup process wrote them)
				if setting_value is not None and len(setting_value) == 0:
					del config_data[guid][setting]
				# Add the username/password/realm values to the credential
				if 'credential' in setting:
					#logger.debug("Found credential setting in stanza: %s/%s" % (guid, setting))
					if setting_value in list(credentials.keys()):
						for s in ['username', 'password', 'realm']:
							if s in list(credentials[setting_value].keys()) and credentials[setting_value][s] is not None:
								config_data[guid][setting + '_' + s] = credentials[setting_value][s]
		# Set the default configuration
		if 'default' in list(config_data.keys()):
			default_target_config = config_data['default']
		else:
			default_target_config = {}

		# See if a GUID was provided explicitly (used by alert actions)
		# 8-4-4-4-12 format 
		try:
			if stanza_guid_alias is not None:
				if re.match(r'[({]?[a-f0-9]{8}[-]?([a-f0-9]{4}[-]?){3}[a-f0-9]{12}[})]?', stanza_guid_alias, flags=re.IGNORECASE):
					if log: logger.debug("Using guid: " + stanza_guid_alias)
					active_config = merge_two_dicts(default_target_config, config_data[stanza_guid_alias])
					if log: logger.debug("Active config: " + str(mask_obj_passwords(active_config)))
					return active_config
		except BaseException as e:
			logger.exception("Exception caught: " + repr(e))

		# Loop through all GUID stanzas for the specified alias
		for guid in list(config_data.keys()):
			if guid != 'default':
				# Merge the configuration with the default config to fill in null values
				config_stanza_settings = merge_two_dicts(default_target_config, config_data[guid])
				guid_is_default = str2bool(config_stanza_settings['default'])
				# Check to see if this is the configuration we want to use
				if 'alias' in list(config_stanza_settings.keys()):
					if config_stanza_settings['alias'] == stanza_guid_alias or (stanza_guid_alias is None and guid_is_default):
						# Return the specified target configuration, or default if target not specified
						if log: logger.debug("Using guid: " + guid)
						if log: logger.debug("Active config: " + str(mask_obj_passwords(config_stanza_settings)))
						return config_stanza_settings
		return None
	except BaseException as e:
		raise Exception("Unable to find target configuration: " + repr(e))

def get_aws_connection(aws_config, log=True):
	global boto3, Config
	import boto3
	from botocore.client import ClientError
	from botocore.config import Config
	
	# Apply proxy settings to AWS config
	proxy_definitions = {
		'http': http_proxy,
		'https': https_proxy
	} if https_proxy is not None or http_proxy is not None else None

	region = aws_config['region'] if 'region' in list(aws_config.keys()) else None
	boto_config = Config(
		signature_version='s3v4',
		proxies=proxy_definitions,
		region_name=region
	)
	
	# Set endpoint URL
	if 'endpoint_url' in list(aws_config.keys()):
		endpoint_url = aws_config['endpoint_url']
	else:
		endpoint_url = None

	use_arn = True if aws_config['credential'] == '[EC2 ARN]' else False

	if use_arn:
		# Use the current/caller identity ARN from the EC2 instance to connect to S3
		logger.debug("Using ARN from STS to connect")
		try:
			account_arn_current = boto3.client('sts').get_caller_identity().get('Arn')
			# arn:aws:sts::800000000000:assumed-role/SplunkInstance_ReadOnly/...
			m = re.search(r'^arn:aws[^:]*:sts::(\d+):[^\/]+\/(.+)\/[^\/]+$', account_arn_current)
			aws_account = m.group(1)
			aws_role = m.group(2)

			sts_client = boto3.client('sts')
			role_arn = "arn:aws:iam::" + aws_account + ":role/" + aws_role
			assumed_role_object = sts_client.assume_role(
				RoleArn=role_arn,
				RoleSessionName="AssumeRoleSession" + random_number
			)

			credentials = assumed_role_object['Credentials']
			return boto3.client(
				's3',
				aws_access_key_id=credentials['AccessKeyId'],
				aws_secret_access_key=credentials['SecretAccessKey'],
				aws_session_token=credentials['SessionToken'],
			)
		except AttributeError:
			raise Exception("Could not connect to S3. Failed to assume role: Unable to get caller identity STS token")
		except ClientError as ce:
			# Try anyway 
			try:
				logger.debug("Could not assume STS role. Attempting to use implicit permissions.")
				return boto3.client('s3')
			except BaseException as cee:
				raise Exception("Could not connect to S3. Failed to assume role: " + repr(e))
		except BaseException as e:
			raise Exception("Could not connect to S3. Failed to assume role: " + repr(e))

	elif 'credential_username' in list(aws_config.keys()) and 'credential_password' in list(aws_config.keys()) and aws_config['credential_username'] is not None and aws_config['credential_password'] is not None:
		# Use the credential to connect to S3
		try:
			logger.debug("Connecting using OAuth credential")
			return boto3.client(
				's3',
				aws_access_key_id=aws_config['credential_username'],
				aws_secret_access_key=aws_config['credential_password'],
				config=boto_config,
				endpoint_url=endpoint_url)
			
		except BaseException as e:
			raise Exception("Could not connect to S3 using OAuth keys: " + repr(e))
	else:
		raise Exception("ARN not configured and credential not specified.")


def s3_folder_contents(client, bucket, prefix):
	# Can't use list_objects_v2 - no owner returned
	#logger.debug("Folder contents")
	paginator = client.get_paginator('list_objects')
	if len(prefix) > 0:
		prefix = (prefix + '/').replace('//', '/')
	for result in paginator.paginate(Bucket=bucket, Prefix=prefix, Delimiter='/'):
		# Submit a separate request for each folder to get its attributes. 
		# head_object doesn't work here, not specific enough.
		for cp in result.get('CommonPrefixes', []):
			folder_name = cp.get('Prefix')
			folder_result = client.list_objects(Bucket=bucket, Prefix=folder_name, MaxKeys=1)
			for content in folder_result.get('Contents'):
				content = yield_s3_object(content, is_directory=True)
				content["id"] = ('/' + bucket + '/' + content["id"]).replace('//', '/')
				yield content

		for content in result.get('Contents', []):
			content = yield_s3_object(content)
			content["id"] = ('/' + bucket + '/' + content["id"]).replace('//', '/')
			# We already retrieved the folders in the for-loop above.
			#logger.debug(content["id"][-1])
			if not content["isDir"] and not content["id"][-1] == '/':
				yield content
		
def yield_s3_object(content, is_directory=False):
	timestamp = content.get('LastModified')
	timestamp = timestamp.timestamp() if timestamp is not None else None
	owner = content.get('Owner')
	owner = owner['DisplayName'] if owner is not None and 'DisplayName' in list(owner.keys()) else owner

	return {
		"id": content.get('Key'),
		"name": content.get('Key').strip('/').split('/')[-1],
		"size": content.get('Size'),
		"modDate": timestamp,
		"owner": owner,
		"isDir": is_directory
	}


def get_aws_s3_directory(aws_config, bucket_folder_path):

	#logger.debug("Default bucket = " + aws_config['default_s3_bucket'])
	logger.debug("Bucket folder path = " + bucket_folder_path)
	folder_path = bucket_folder_path.strip('/').split('/')
	bucket_name = folder_path[0]
	if bucket_name is None or len(bucket_name) == 0:
		logger.debug("No bucket specified")
		folder_prefix = '/'
		bucket_name = ''
		#pass #bucket_name = aws_config['default_s3_bucket'] Default bucket code happens in rest_ep_dirlist
	if len(folder_path) >= 1:
		folder_prefix = '/'.join(folder_path[1:]).strip('/')
	#elif len(folder_path) == 1:
	#	folder = '/' + bucket_name
	else:
		folder_prefix = '/'
	logger.debug("Folder Prefix = " + folder_prefix)

	try:
		conn = get_aws_connection(aws_config)
	except BaseException as e:
		raise Exception("Could not connect to AWS: " + repr(e))

	file_list = []
	if len(bucket_name) > 0:
		logger.debug("Getting bucket contents for " + bucket_name)
		# Get the directory listing within the bucket
		# List files and folders
		for e in s3_folder_contents(conn, bucket_name, folder_prefix):
			file_list.append( e )
	else:
		# Get the list of buckets
		logger.debug("Getting list of buckets")
		bucket_list = conn.list_buckets()
		bucket_list_props = bucket_list['Buckets']
		for b in bucket_list_props:	
			timestamp = b['CreationDate']
			timestamp = timestamp.timestamp() if timestamp is not None else None
			file_list.append( {
				"id": '/' + b['Name'],
				"name": b['Name'],
				"modDate": timestamp,
				"isDir": True
			} )
	return file_list


def get_sftp_connection(target_config):
	global pysftp
	import pysftp

	# Check to see if we have credentials
	valid_settings = []
	for l in list(target_config.keys()):
		if target_config[l] is not None:
			if target_config[l][0] == '$':
				target_config[l] = decrypt_with_secret(target_config[l]).strip()
			if len(target_config[l]) > 0:
				#logger.debug("l.strip() = [" + target_config[l].strip() + "]")
				valid_settings.append(l) 
	#logger.debug("Valid settings: " + str(valid_settings))
	#logger.debug("Target config: " + str(mask_obj_passwords(target_config)))
	if 'host' in valid_settings and 'port' in valid_settings:
		# A target has been configured. Check for credentials.
		# Disable SSH host checking (fix later - set as an option? !!!)
		cnopts = pysftp.CnOpts()
		cnopts.hostkeys = None
		try:
			if 'credential_username' in valid_settings and 'credential_password' in valid_settings and not 'private_key' in valid_settings:
				try:
					sftp = pysftp.Connection(host=target_config['host'], username=target_config['credential_username'], password=target_config['credential_password'], cnopts=cnopts)
					return sftp
				except BaseException as e:
					exit_error(logger, "Unable to setup SFTP connection with password: " + repr(e), 921982)
			elif 'credential_username' in valid_settings and 'private_key' in valid_settings:
				# Write the decrypted private key to a temporary file
				temp_dir = os.getcwd()
				key_file = os.path.join(temp_dir, 'epsftp_private_key_' + random_number)
				private_key = target_config['private_key'].replace('\\n', '\n')
				with open(key_file, "w") as f:
					f.write(private_key)
					f.close()
				try:
					if 'passphrase_credential' in valid_settings:
						sftp = pysftp.Connection(host=target_config['host'], private_key=key_file, private_key_pass=target_config['passphrase_credential_password'], cnopts=cnopts)
					else:
						sftp = pysftp.Connection(host=target_config['host'], username=target_config['credential_username'], private_key=key_file, cnopts=cnopts)
					return sftp
				except BaseException as e:
					raise Exception("Unable to setup SFTP connection with private key: " + repr(e))
			else:
				raise Exception("Required SFTP settings not found")
		except BaseException as e: 
			raise Exception("Could not find or decrypt the specified SFTP credential: " + repr(e))
	else:
		raise Exception("Could not find required SFTP configuration settings")
		
def get_sftp_directory(sftp_config, folder_path):
	sftp = get_sftp_connection(sftp_config)
	if len(folder_path) == 0:
		folder_path = '/'
	logger.debug("SFTP folder path: " + folder_path)
	dirlist = sftp.listdir_attr(folder_path)
	file_list = []
	for f in dirlist:
		entry = yield_sftp_object(f, folder_path)
		if entry is not None:
			file_list.append(entry)
	# Sort the listing
	# Directories first then filename
	file_list.sort(key=lambda x: (x["isDir"], x["name"]))
	return file_list

def yield_sftp_object(content, folder_path):
	folder_path = folder_path.rstrip('/').rstrip('\\')
	if content.filename not in [u'.', u'..']:
		return {
			"id": folder_path + '/' + content.filename,
			"name": content.filename,
			"isHidden": True if content.filename[0] == '.' else False,
			"size": content.st_size,
			"modDate": content.st_mtime,
			"parentId": folder_path,
			"isDir": True if stat.S_ISDIR(content.st_mode) or (stat.S_ISLNK(content.st_mode) and stat.S_IMODE(content.st_mode) & 1) else False
		}
	else:
		return None

def get_smb_directory(smb_config, folder_path = '/'):
	global SMBConnection
	from smb.SMBConnection import SMBConnection
	
	# Get the local client hostname
	client_name = socket.gethostname()
	# Delete any domain from the client hostname string
	if '.' in client_name:
		client_name = client_name[0:client_name.index('.')]

	valid_settings = []
	for setting, value in list(smb_config.items()):
		if value is not None:
			if len(value) > 0:
				if value[0] == '$':
					smb_config[setting] = decrypt_with_secret(value).strip()
				valid_settings.append(setting) 
	
	#logger.debug("Valid settings: " + str(valid_settings))
	#logger.debug("smb_config: " + str(smb_config))
	
	try:
		if all (k in valid_settings for k in ('host', 'credential_username', 'credential_password', 'share_name')):
			try:
				if 'credential_realm' in valid_settings:
					domain = smb_config['credential_realm']
				else:
					domain = smb_config['host']
				try:
					# Try port 445 first
					conn = SMBConnection(smb_config['credential_username'], smb_config['credential_password'], client_name, 
						smb_config['host'], domain=domain, use_ntlm_v2=True, 
						sign_options = SMBConnection.SIGN_WHEN_SUPPORTED, is_direct_tcp=True) 
					connected = conn.connect(smb_config['host'], 445, timeout=5)
					
					if smb_config['share_name'] not in (s.name for s in conn.listShares(timeout=10)):
						raise Exception("Unable to find the specified share name on the server")
						
					# Omitting this code because Splunk prohibits UDP socket functionality in appinspect
					# Port 139 connection is dependent on NBNS protocol
					'''
					try:
						# Try port 139 if that didn't work
						conn = SMBConnection(target_config['credential_username'], target_config['credential_password'], client_name, 
						target_config['host'], domain=domain, use_ntlm_v2=True,
						sign_options = SMBConnection.SIGN_WHEN_SUPPORTED) 
						connected = conn.connect(target_config['host'], 139, timeout=5)
					except BaseException as e139:
						p139_error = repr(e139)
						raise Exception("Errors connecting to host: \\nPort 139: %s\\nPort 445: %s" % (p139_error, p445_error))

					conn = SMBConnection(smb_config['credential_username'], smb_config['credential_password'], client_name, 
						smb_config['host'], domain=domain, use_ntlm_v2=True,
						sign_options = SMBConnection.SIGN_WHEN_SUPPORTED) 
					conn.connect(smb_config['host'], 139)

					'''
				
				except BaseException as e445:
					raise Exception("Could not connect to server on port 445: %s" % repr(e445))
				
				# List the directory contents
				contents = conn.listPath(smb_config['share_name'], folder_path)
				file_list = []
				for content in contents:
					entry = yield_smb_object(content, folder_path)
					if entry is not None:
						file_list.append(entry)
				
				return file_list
			except BaseException as e:
				raise Exception(repr(e))
		else:
			raise Exception("Required settings not found")
	except BaseException as e: 
		raise Exception(repr(e))

def yield_smb_object(content, folder_path):
	folder_path = folder_path.rstrip('/').rstrip('\\')
	if content.filename not in [u'.', u'..']:
		return {
			"id": folder_path + '/' + content.filename,
			"name": content.filename,
			"isHidden": True if content.file_attributes & 2 > 0 else False,
			"size": content.file_size,
			"modDate": content.last_write_time,
			"parentId": folder_path,
			"isDir": True if content.isDirectory else False
		}
	else:
		return None

def get_box_connection(target_config):
	from boxsdk import JWTAuth, Client, BoxAPIException
	# Check to see if we have credentials
	valid_settings = []
	
	for l in list(target_config.keys()):
		if target_config[l] is not None:
			if len(target_config[l]) > 0:
				valid_settings.append(l) 
	
	if all(x in valid_settings for x in 
		['client_credential_username', 'client_credential_password', 'enterprise_id', 'public_key_id', 'private_key', 'passphrase_credential_password']):

		try:
			enterprise_id = target_config['enterprise_id']
			client_id = target_config['client_credential_username']
			client_secret = target_config['client_credential_password']
			public_key_id = target_config['public_key_id']
			private_key = target_config['private_key'].replace('\\n', '\n')
			passphrase = target_config['passphrase_credential_password']

			box_authentication = {
				"enterpriseID": enterprise_id,
				"boxAppSettings": {
					"clientID": client_id,
					"clientSecret": client_secret,
					"appAuth": {
						"publicKeyID": public_key_id,
						"privateKey": private_key,
						"passphrase": passphrase
					}
				}
			}
			
			auth = JWTAuth.from_settings_dictionary(box_authentication)

			if auth is not None:
				# Use the credential to connect to Box
				try:
					return Client(auth)
				except BoxAPIException as be:
					raise Exception("Could not connect to Box: " + be.message)
				except BaseException as e:
					raise Exception("Could not connect to Box: " + repr(e))
			else:
				raise Exception("Box credential not configured.")
		except AttributeError:
			logger.critical("Error ")
			raise Exception("Could not connect to Box (AttributeError) ")
		except BaseException as e: 
			logger.exception("Could not connect to Box: " + repr(e))
			raise Exception("Could not connect to Box: " + repr(e))
	else:
		raise Exception("Could not find required configuration settings")

def get_box_directory(target_config, folder_path):
	from boxsdk import BoxAPIException
	
	# Let the exception pass through
	client = get_box_connection(target_config)
	if 'default_folder' in list(target_config.keys()) and (folder_path is None or len(folder_path) == 0):
		folder_path = target_config['default_folder']
	
	try:
		if re.match(r'^\d+\/$', folder_path):
			# Folder path is actually a folder ID
			box_folder_object = client.folder(folder_id=folder_path.replace('/', '')).get()
		else:
			# Folder path is actually a folder path
			subfolders = folder_path.strip('/').split('/')
			if '' in subfolders:
				subfolders.remove('')
			logger.debug("Folders: %s" % str(subfolders))
			# Prepend the list with the root element
			box_folder_object = client.root_folder().get()
			# Walk the folder path until we find the target directory
			for i in range(len(subfolders)):
				subfolder_name = subfolders[i]
				logger.debug("Looking for folder: %s" % subfolder_name)
				folder_contents = box_folder_object.get_items()
				# If we are at the last entry, we already have the folder_contents assigned
				if i != len(subfolders):
					# Get the contents of the folder
					# folder object is from the previous iteration
					for item in folder_contents:
						if item.type == 'folder':
							#logger.debug('{0} {1} is named "{2}"'.format(item.type.capitalize(), item.id, item.name))
							if subfolder_name == item.name:
								logger.debug("Found a target folder ID: %s" % str(item.id))
								box_folder_object = client.folder(folder_id=item.id)
								break
		
		fields = ["id", "name", "owner", "content_modified_at", "item_collection", "owner", "size", "parent", "status"]
		folder_data = box_folder_object.get_items(fields=fields)
		#logger.debug(folder_data.__dict__)
		file_list = []
		#if hasattr(folder_data.item_collection, "item_collection"):
		#	if hasattr(folder_data.item_collection, "entries"):
		#		logger.debug("Has entries")
		for item in folder_data:
			#logger.debug(item.name)
			#if item.type == 'file':
				#logger.debug(item.status)
			try:
				#if item.item_status == "active":
				entry = {
					#"box_id": item.id,
					"id": ('/' + '/'.join(subfolders) + '/' + item.name).replace('//', '/'),
					#"id": item.id,
					"name": item.name
					#"parentId": ('/' + '/'.join(subfolders)).replace('//', '/')
				}
				if item.type == 'folder':
					entry["isDir"] = True
					#f = client.folder(item.id).get()
				else:
					entry["isDir"] = False
					#f = client.file(item.id).get()
				#entry["link"] = f.url
				if hasattr(item, "owned_by"):
					entry["owner"] = item.owned_by.login
				entry_ts = item.content_modified_at
				# Remove the last colon (e.g. from -04:00)
				entry_ts = entry_ts[0:entry_ts.rindex(':')]+entry_ts[entry_ts.rindex(':')+1:]
				entry["modDate"] = datetime.strptime(entry_ts, '%Y-%m-%dT%H:%M:%S%z').timestamp()
				entry["size"] = item.size
				if hasattr(item, "parent"):
					if hasattr(item.parent, "id"):
						entry["parentId"] = item.parent.id
				# Folder -or- active file
				#if not hasattr(item, "status") or (hasattr(item, "status") and item.status == "active"):
				#logger.debug(entry)
				file_list.append(entry)

			except BaseException as e:
				logger.debug("Exception: " + repr(e))

		#logger.debug("done")
		return file_list


	except BoxAPIException as be:
		raise Exception("Could not retrieve folder contents: " + be.message)
	except BaseException as e:
		raise Exception("Could not retrieve folder contents: " + repr(e))

