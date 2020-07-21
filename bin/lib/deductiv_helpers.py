from __future__ import print_function
from builtins import str
from future import standard_library
standard_library.install_aliases()
import sys, os
import urllib.request, urllib.parse, urllib.error
import re
import logging
from logging import handlers

# Add lib folder to import path
path_prepend = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib')
sys.path.append(path_prepend)
import splunk.entity as en

def get_credentials(app, session_key):
	try:
		# list all credentials
		entities = en.getEntities(['admin', 'passwords'], namespace=app,
									owner='nobody', sessionKey=session_key)
	except Exception as e:
		raise Exception("Could not get %s credentials from Splunk. Error: %s"
						% (app, str(e)))

	credentials = []
	for i, c in list(entities.items()):
		# c.keys() = ['clear_password', 'password', 'username', 'realm', 'eai:acl', 'encr_password']
		credentials.append( {'realm': c["realm"], 'username': c["username"], "password": c["clear_password"] } )
	
	if len(credentials) > 0:
		return credentials
	else:
		raise Exception("No credentials have been found")	

# HTTP request wrapper
def request(method, url, data, headers):
	"""Helper function to fetch data from the given URL"""
	req = urllib.request.Request(url, data, headers)
	req.get_method = lambda: method
	res_txt = ""
	res_code = "0"
	try: 
		res = urllib.request.urlopen(req)
		res_txt = res.read()
		res_code = res.getcode()
	except urllib.error.HTTPError as e:
		res_code = e.code
		res_txt = e.read()
		eprint("HTTP Error: " + res_txt)
	except BaseException as e:
		eprint("URL Request Error: " + str(e))
		sys.exit(1)
	return res_txt, res_code

def setup_logging(logger_name):
	logger = logging.getLogger(logger_name)
	return logger

# For alert actions
def setup_logger(level, filename):
	logger = logging.getLogger(filename)
	# Prevent the log messages from being duplicated in the python.log file
	logger.propagate = False 
	logger.setLevel(level)
	
	log_file = os.path.join( os.environ['SPLUNK_HOME'], 'var', 'log', 'splunk', filename )
	file_handler = logging.handlers.RotatingFileHandler(log_file, maxBytes=25000000, backupCount=2)
	formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
	file_handler.setFormatter(formatter)
	
	logger.addHandler(file_handler)
	
	return logger

# Merge two dictionary objects (x,y) into one (z)
def merge_two_dicts(x, y):
	z = x.copy()	# start with x's keys and values
	z.update(y)	# modifies z with y's keys and values & returns None
	return z

def hex_convert(s):
	return ":".join("{:02x}".format(ord(c)) for c in s)

def str2bool(v):
	return v.lower() in ("yes", "true", "t", "1")

# STDERR printing for python 3
def eprint(*args, **kwargs):
	print(*args, file=sys.stderr, **kwargs)

def escape_quotes(string):
	string = re.sub(r'(?<=\\)"', r'\\\"', string)
	string = re.sub(r'(?<!\\)"', r'\"', string)
	return string

