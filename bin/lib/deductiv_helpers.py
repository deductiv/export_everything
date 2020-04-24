from __future__ import print_function
from builtins import str
import sys, os
import urllib.request, urllib.parse, urllib.error
import logging
from logging import handlers

def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

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
	z = x.copy()   # start with x's keys and values
	z.update(y)	# modifies z with y's keys and values & returns None
	return z

def hex_convert(s):
	return ":".join("{:02x}".format(ord(c)) for c in s)
	