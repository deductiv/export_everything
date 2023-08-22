# Common cross-app functions to simplify code

# Copyright 2023 Deductiv Inc.
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.3.0 (2023-08-11)

import sys
import os
import urllib.request
import urllib.parse
import urllib.error
import http.client as httplib
import ssl
import re
import logging
import configparser
import time
import datetime
import socket
import json
import random
import csv
import splunk
import splunk.entity as en
from splunk.clilib import cli_common as cli
from splunk.rest import simpleRequest

# Add lib folders to import path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
# https://github.com/HurricaneLabs/splunksecrets/blob/master/splunksecrets.py
from splunksecrets import decrypt

def get_credentials(app, session_key):
	try:
		# list all credentials
		entities = en.getEntities(['admin', 'passwords'], namespace=app,
          owner='nobody', sessionKey=session_key)
	except Exception as e:
		raise Exception("Could not get %s credentials from Splunk. Error: %s" % (app, str(e)))

	credentials = []
	
	for id, c in list(entities.items()):		# pylint: disable=unused-variable
		# c.keys() = ['clear_password', 'password', 'username', 'realm', 'eai:acl', 'encr_password']
		if c['eai:acl']['app'] == app:
			credentials.append({'realm': c["realm"], 
			  'username': c["username"], 
			  "password": c["clear_password"]})
	
	if len(credentials) > 0:
		return credentials
	else:
		raise Exception("No credentials have been found")

# HTTP request wrapper
def request(method, url, data, headers, conn=None, verify=True, is_cloud=False):
	"""Helper function to fetch data from the given URL"""
	# See if this is utf-8 encoded already
	try:
		data.decode('utf-8')
	except AttributeError:
		try:
			data = urllib.parse.urlencode(data).encode("utf-8")
		except:
			data = data.encode("utf-8")
	url_tuple = urllib.parse.urlparse(url)
	if conn is None:
		close_conn = True
		# Force verified HTTPS for Splunk Cloud
		if url_tuple.scheme == 'https' or is_cloud:
			if verify or is_cloud:
				conn = httplib.HTTPSConnection(url_tuple.netloc, context=ssl.create_default_context())
			else:
				conn = httplib.HTTPSConnection(url_tuple.netloc, context=ssl._create_unverified_context())
		elif url_tuple.scheme == 'http':
			conn = httplib.HTTPConnection(url_tuple.netloc)
	else:
		close_conn = False
	try:
		conn.request(method, url, data, headers)
		response = conn.getresponse()
		response_data = response.read()
		response_status = response.status
		if close_conn:
			conn.close()
		return response_data, response_status
	except BaseException as e:
		raise Exception("URL Request Error: " + str(e))

def setup_logging(logger_name):
	logger = logging.getLogger(logger_name)
	return logger

# For alert actions
def setup_logger(level, filename, facility):
	random_number = str(random.randint(10000, 100000))
	logger = logging.getLogger(filename + str(random_number))
	# Prevent the log messages from being duplicated in the python.log file
	logger.propagate = False 
	logger.setLevel(level)
	
	log_file = os.path.join(os.environ['SPLUNK_HOME'], 'var', 'log', 'splunk', filename)
	file_handler = logging.handlers.RotatingFileHandler(log_file, maxBytes=25000000, backupCount=2)
	formatter = logging.Formatter('%(asctime)s {0}[%(process)d] %(levelname)s %(message)s'.format(facility))
	file_handler.setFormatter(formatter)
	stderr_handler = logging.StreamHandler(sys.stderr)
	stderr_handler.setLevel(logging.ERROR)
	logger.addHandler(file_handler)
	logger.addHandler(stderr_handler)
	
	return logger

def get_conf_stanza(config_file, stanza):
	# Get the configuration using the API
	# If this fails, read the configs directly
	# Implemented for indexers where configs only live in the knowledge bundle
	try:
		config = cli.getConfStanza(config_file, stanza)
	except (splunk.clilib.control_exceptions.ParsingError, KeyError):
		try:
			eprint('Reading configuration file directly: ' + config_file)
			config_all_stanzas = read_config(config_file + '.conf')
			config = dict(config_all_stanzas.items(stanza))
		except configparser.NoSectionError:
			config = get_conf_file(config_file)[stanza]
	return config

def get_conf_file(config_file):
	# Get the configuration using the API
	# If this fails, read the configs directly
	# Implemented for indexers where configs only live in the knowledge bundle
	manual_read = False
	try:
		config = cli.getConfStanzas(config_file)
		if len(list(config.keys())) <= 1: # default only
			manual_read = True
	except splunk.clilib.control_exceptions.ParsingError:
		manual_read = True
	if manual_read:
		# Convert each stanza/section to a dict
		config_items = read_config(config_file + '.conf')
		config = { c:dict(config_items.items(c)) for c in config_items }
	return config

def read_config(filename):
	config = configparser.ConfigParser()
	app_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
	app_child_dirs = ['default', 'local']
	for cdir in app_child_dirs:
		try:
			config_file = os.path.join(app_dir, cdir, filename)
			config.read(config_file)
		except BaseException as e:
			eprint("Error reading config file %s: %s", config_file, e)
	return config

# Merge two dictionary objects (x,y) into one (z)
def merge_two_dicts(x, y):
	z = x.copy()	# start with x's keys and values
	z.update(y)	# modifies z with y's keys and values & returns None
	return z

def hex_convert(s):
	return ":".join("{:02x}".format(ord(c)) for c in s)

def str2bool(v):
	if isinstance(v, bool):
		return v
	else:
		return str(v).lower() in ("yes", "y", "true", "t", "1")

# STDERR printing for python 3
def eprint(*args, **kwargs):
	print(*args, file=sys.stderr, **kwargs)

def escape_quotes(string):
	string = re.sub(r'(?<=\\)"', r'\\\"', string)
	string = re.sub(r'(?<!\\)"', r'\"', string)
	return string

def escape_quotes_csv(string):
	return string.replace('"', '""')

def is_ipv4(host):
	r = "^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])$"
	if(re.search(r, host)):
		return True
	else:
		return False

def replace_keywords(s):

	now = str(int(time.time()))
	nowms = str(int(time.time()*1000))
	nowft = datetime.datetime.now().strftime("%F_%H%M%S")
	today = datetime.datetime.now().strftime("%F")
	yesterday = (datetime.datetime.now() - datetime.timedelta(days=1)).strftime("%F")

	strings_to_replace = {
		'__now__': now,
		'__nowms__': nowms,
		'__nowft__': nowft,
		'__today__': today,
		'__yesterday__': yesterday
	}
	
	for x in list(strings_to_replace.keys()):
		s = s.replace(x, strings_to_replace[x])
	return s

class search_console:
	def __init__(self, logger, caller_object):
		self.logger = logger
		self.caller_object = caller_object
		
	def exit_error(self, message, error_code=1):
		eprint(message)
		if self.caller_object is not None:
			if hasattr(self.caller_object, '_configuration'):
				command = str(self.caller_object._configuration.command).split(' ')[0]
			else:
				command = ''
			if hasattr(self.caller_object, 'write_error'):
				self.caller_object.write_error(f'{command}: {message} ({command})')
		self.logger.critical(message)
		exit(error_code)

def decrypt_with_secret(encrypted_text):
	# Check for encryption
	if encrypted_text[:1] == '$':
		# Decrypt the text
		# Read the splunk.secret file
		#
		# NOT USED IN SPLUNK CLOUD (see caller functions)
		#
		with open(os.path.join(os.getenv('SPLUNK_HOME'), 'etc', 'auth', 'splunk.secret'), 'r') as ssfh:
			splunk_secret = ssfh.readline()
		# Call the decrypt function from splunksecrets.py
		return decrypt(splunk_secret, encrypted_text)
	else:
		# Not encrypted
		return encrypted_text

def port_is_open(ip, port):
	s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
	s.settimeout(3)
	try:
		s.connect((ip, int(port)))
		s.shutdown(2)
		return True
	except:
		return False

if __name__ == "__main__":
	pass

def get_tokens(searchinfo):
	tokens = {}
	# Get the host of the splunkd service
	splunkd_host = searchinfo.splunkd_uri[searchinfo.splunkd_uri.index("//")+2:searchinfo.splunkd_uri.rindex(":")]
	splunkd_port = searchinfo.splunkd_uri[searchinfo.splunkd_uri.rindex(":")+1:]

	tokens = {
		'splunkd_host': splunkd_host,
		'splunkd_port': splunkd_port
	}

	# Get the search job attributes
	if searchinfo.sid: 
		job_uri = en.buildEndpoint(
			[
				'search', 
				'jobs', 
				searchinfo.sid
			], 
			namespace=searchinfo.app, 
			owner=searchinfo.owner
		)
		try:
			job_response = simpleRequest(job_uri, method='GET', getargs={'output_mode':'json'}, sessionKey=searchinfo.session_key)[1]
			search_job = json.loads(job_response)
			job_content = search_job['entry'][0]['content']
		except splunk.ResourceNotFound:
			# This probably ran on the indexer and failed
			job_content = {}
	else:
		job_content = {}

	for key, value in list(job_content.items()):
		if value is not None:
			tokens['job.' + key] = json.dumps(value, default=lambda o: o.__dict__)
	#eprint("job_content=" + json.dumps(job_content))

	if 'label' in list(job_content.keys()):
		tokens['name'] = job_content['label']

		# Get the saved search properties
		entityClass = ['saved', 'searches']
		uri = en.buildEndpoint(
			entityClass,
			namespace=searchinfo.app, 
			owner=searchinfo.owner
		)

		responseBody = simpleRequest(uri, method='GET', getargs={'output_mode':'json'}, sessionKey=searchinfo.session_key)[1]

		saved_search = json.loads(responseBody)
		ss_content = saved_search['entry'][0]['content']
		#eprint("SSContent=" + json.dumps(ss_content))

		for key, value in list(ss_content.items()):
			if not key.startswith('display.'):
				if value is not None:
					tokens[key] = json.dumps(value, default=lambda o: o.__dict__)

	tokens['owner'] = searchinfo.owner
	tokens['app'] = searchinfo.app
	#tokens['results_link'] = 'http://127.0.0.1:8000/en-US/app/search/search?sid=1622650709.10799'
	
	# Parse all of the nested objects (recursive function)
	for t, tv in list(tokens.items()):
		tokens = merge_two_dicts(tokens, parse_nested_json(t, tv))
	
	#for t, tv in list(tokens.items()):
	#	if type(tv) == str:
	#		eprint(t + '=' + tv)
	#	else:
	#		eprint(t + "(type " + str(type(tv)) + ") = " + str(tv))
	return tokens

def parse_nested_json(parent_name, j):
	retval = {}
	try:
		if j is not None:
			sub_tokens = json.loads(j)
			if sub_tokens is not None:
				for u, uv in list(sub_tokens.items()):
					if type(uv) == dict:
						retval = merge_two_dicts(retval, parse_nested_json(parent_name + '.' + u, json.dumps(uv)))
					else:
						retval[(parent_name + '.' + u).replace('..', '.')] = uv
						#eprint('added subtoken ' + (parent_name + '.' + u).replace('..', '.') + '=' + str(uv))
		return retval
	except ValueError:
		return {parent_name: j}
	except AttributeError:
		return {parent_name: j}
	except BaseException as e:
		eprint("Exception parsing JSON subtoken: " + repr(e))
	
def replace_object_tokens(o):
	tokens = get_tokens(o._metadata.searchinfo)
	for var in vars(o):
		val = getattr(o, var)
		try:
			if '$' in val:
				try:
					setattr(o, var, replace_string_tokens(tokens, val))
				except BaseException as e:
					eprint("Error replacing token text for variable %s value %s: %s" % (var, val, repr(e)))
		except:
			# Probably an index out of range error
			pass
	#return o

	#for t, v in list(tokens.items()):
	#	param = param.replace('$'+t+'$', v)
	#return param

def replace_string_tokens(tokens, v):
	b = v
	# Replace all tokenized strings
	for t, tv in list(tokens.items()):
		if tv is not None:
			v = v.replace('$'+t+'$', str(tv).strip('"').strip("'"))
	# Print the result if the value changed
	#if b != v:
	#	eprint(b + ' -> ' + v)
	return v

def recover_parameters(obj):
	args = sys.argv[2:]
	for a in args:
		key = a[0:a.index('=')].strip('"')
		value = a[a.index('=')+1:].strip('"')
		if value != '__default__':
			setattr(obj, key, value)
		else:
			setattr(obj, key, None)

def log_proxy_settings(logger):
	# Enumerate proxy settings
	http_proxy = os.environ.get('HTTP_PROXY')
	https_proxy = os.environ.get('HTTPS_PROXY')
	proxy_exceptions = os.environ.get('NO_PROXY')

	if http_proxy is not None:
		logger.debug("HTTP proxy: %s" % http_proxy)
	if https_proxy is not None:
		logger.debug("HTTPS proxy: %s" % https_proxy)
	if proxy_exceptions is not None:
		logger.debug("Proxy Exceptions: %s" % proxy_exceptions)

def is_cloud(session_key):
	uri = en.buildEndpoint(["server", "info", "server-info"], namespace='-', owner='nobody')
	server_content = simpleRequest(uri, getargs={"output_mode": "json"}, sessionKey=session_key, raiseAllErrors=True)[1]
	try:
		# Test for non-cloud environment
		#return json.loads(server_content)['entry'][0]['content']['federated_search_enabled'] # true
		# See if instance_type is set to "cloud"
		instance_type = json.loads(server_content)['entry'][0]['content']['instance_type']
		return instance_type == "cloud"
	except KeyError:
		return False

def get_search_status(sid):
	search_status_file = os.path.join(os.environ['SPLUNK_HOME'], 'var', 'run', 'splunk', 'dispatch', sid, 'status.csv')
	try:
		with open(search_status_file) as status_csv:
			status_reader = csv.DictReader(status_csv)
			for row in status_reader:
				return row['state']
	except BaseException as e:
		eprint('Exception reading search status from dispatch: %s', str(e))
		return None

def is_search_finalizing(sid):
	return get_search_status(sid) == 'FINALIZING'

def attach_dyn_prop(instance, prop_name, prop_fn):
	"""Attach prop_fn to instance with name prop_name.
	Assumes that prop_fn takes self as an argument.
	Reference: https://stackoverflow.com/a/1355444/509706
	"""
	class_name = instance.__class__.__name__ + 'Child'
	child_class = type(class_name, (instance.__class__,), {prop_name: property(prop_fn)})

	instance.__class__ = child_class
