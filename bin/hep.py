# hep.py
# Push Splunk events to an HTTP listener (such as Splunk HEC) over JSON
#
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 1.01

import os, sys
import json
import urllib
import httplib2
import time
import logging
from logging import handlers

# Add lib folder to import path
path_prepend = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib')
sys.path.append(path_prepend)

# Use the library from George Starcher for HTTP Event Collector
# https://github.com/georgestarcher/Splunk-Class-httpevent
from splunk_http_event_collector.http_event_collector import http_event_collector
from CsvResultParser import *

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

if len(sys.argv) > 1 and sys.argv[1] == "--execute":
	script = os.path.basename(__file__)

	# Setup the logging handler
	logger = setup_logger(logging.DEBUG, script.replace('.py', '.log'))
	#logger.debug("Script %s called" % script)

	try:
		stdin = sys.stdin.read()
		args = json.loads(stdin)
	except ValueError, e:
		logger.critical("Input could not be parsed in JSON: %s" % stdin)
		logger.critical("Please check alert_actions.conf for payload_format = json")
		exit(1)

	logger.debug("Arguments: %s" % json.dumps(args))
	try:
		app = args['app']
		savedsearch_name = args['search_name']
		owner = args['owner']
		logger.info("%s called by %s/%s for user %s" % (script, app, savedsearch_name, owner))
	except BaseException, e:
		logger.error("Couldn't log script startup: %s", e.message)

	http_proxy = os.environ.get('HTTP_PROXY')
	https_proxy = os.environ.get('HTTPS_PROXY')
	proxy_exceptions = os.environ.get('NO_PROXY')

	if http_proxy is not None:
		logger.info("HTTP proxy: %s" % http_proxy)
	if https_proxy is not None:
		logger.info("HTTPS proxy: %s" % https_proxy)
	if proxy_exceptions is not None:
		logger.info("Proxy Exceptions: %s" % proxy_exceptions)

	config = args.get('configuration')
	session_key = args.get('session_key')

	# Get the REST endpoint for the search so we can query it later
	search_uri = args.get('search_uri')
	# Splunkd URI (default service on tcp/8089)
	server_uri = args.get('server_uri')

	logger.debug("Imported config: %s" % config)

	hec_token = config['api.hec_token']
	hec_host = config['api.hec_host']

	# Special event key fields that can be specified/overridden in the alert action
	meta_keys = ['source', 'sourcetype', 'host', 'index']
	
	# Parse results CSV file directly
	search_output_file = args.get('results_file')
	results = CsvResultParser(search_output_file).getResults()['fields']

	# Make sure Splunk didn't feed us substituted values for all events from event #1
	# Query the REST API for the search endpoint
	url = server_uri + search_uri + '?output_mode=json'
	logging.debug("Connecting to URL: %s" % url)

	# !!! Make validation optional later
	rest_http = httplib2.Http(disable_ssl_certificate_validation=True)
	rest_resp, rest_content = rest_http.request(url, 'GET', headers={'Authorization': 'Splunk %s' % session_key, 'Accept': 'application/json'})
	logger.debug("REST response: %s" % str(rest_resp))

	rest_content = json.loads(rest_content)
	rest_content = rest_content['entry'][0]['content']
	#logger.debug("REST content: %s" % json.dumps(rest_content))

	# Parse the real config arguments for variables from the saved search
	output_meta_fromevent = {}
	for k in meta_keys:
		okey = 'action.hep.param.output_' + k
		if okey in rest_content.keys():
			if '$result.' in rest_content[okey]:
				output_meta_fromevent[k] = rest_content[okey].replace("$", "").replace("result.", "")
		
	logger.debug("Source event meta fields: %s" % output_meta_fromevent)
	logger.debug("Search results: %s" % json.dumps(results))
	
	# Create HEC object
	hec = http_event_collector(hec_token, hec_host)

	for event in results:
		#logger.debug("Event: %s" % event)
		# Build event payload
		payload = {}
		if '_time' in event:
			payload.update({ "time": event['_time'] })
			del(event['_time'])
		else:
			payload.update({ "time": time.time() })
		
		# Remove conflicts for source/sourcetype/index/host
		for k in meta_keys:
			okey = 'output_'+ k
			# If the event contains a meta field
			if k in event.keys():
				# If we found it had a variable defined within it (e.g. $result.sourcetype$)
				if k in output_meta_fromevent.keys():
					# Field is in the event and in the alert action config. Use the alert action config value.
					# Find variables to substitute
					#logger.debug("Checking for %s field in event" % output_meta_fromevent[k])
					payload.update({ k: event[output_meta_fromevent[k]] })
				else:
					# Field is in the event but not in the alert action config.  Use the event value.
					payload.update({ k: event[k] })
				# Delete the field from the event, so it's not duplicated in the payload under the "event" field.
				del(event[k])
			elif okey in config.keys():
				# Static values from the alert action config, or other non-result variables like $name$
				payload.update({ k: config[okey] })
				#logger.debug("%s set to %s" % (k, config[okey]))

		if not "host" in event.keys():
			payload.update({ "host": args['server_host'] })

		# Only send _raw if the _raw field was included in the search result.
		# (Don't include other fields/values)
		if '_raw' in event.keys():
			#logger.info("Using _raw from search result")
			payload.update({ "event": event['_raw'] })
		else:
			payload.update({ "event": event })

		logger.debug("Payload: %s" % payload)
		hec.batchEvent(payload)

	hec.flushBatch()
	logger.info("Successfully pushed events. count=%s target=%s app=%s savedsearch=\"%s\" user=%s" % (len(results), hec_host, app, savedsearch_name, owner))

