#!/usr/bin/env python
# 
# hep_alert.py
# Push Splunk events to an HTTP listener (such as Splunk HEC) over JSON - Alert Action
#
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 1.1.3 (2020-11-11)

from __future__ import print_function
from future import standard_library
standard_library.install_aliases()
from builtins import str
import os, sys
import json
import time

# Add lib folders to import path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
# pylint: disable=import-error
from splunk.clilib import cli_common as cli
from CsvResultParser import CsvResultParser
from splunk_http_event_collector.http_event_collector import http_event_collector # https://github.com/georgestarcher/Splunk-Class-httpevent
import deductiv_helpers as helpers

if len(sys.argv) > 1 and sys.argv[1] == "--execute":
	script = os.path.basename(__file__)

	try:
		cfg = cli.getConfStanza('hep','settings')
	except BaseException as e:
		raise Exception("Could not read configuration: " + repr(e))
	
	# Facility info - prepended to log lines
	facility = os.path.basename(__file__)
	facility = os.path.splitext(facility)[0]
	try:
		logger = helpers.setup_logger(cfg["log_level"], 'hep.log', facility)
		logger.info("HEP alert action called")
	except BaseException as e:
		raise Exception("Could not create logger: " + repr(e))

	try:
		stdin = sys.stdin.read()
		args = json.loads(stdin)
	except ValueError as e:
		logger.critical("Input could not be parsed in JSON: %s" % stdin)
		logger.critical("Please check alert_actions.conf for payload_format = json")
		exit(1)

	logger.debug("Arguments: %s" % json.dumps(args))
	try:
		app = args['app']
		savedsearch_name = args['search_name']
		owner = args['owner']
		logger.info("%s called by %s/%s for user %s" % (script, app, savedsearch_name, owner))
	except BaseException as e:
		logger.error("Couldn't log script startup: %s", repr(e))

	http_proxy = os.environ.get('HTTP_PROXY')
	https_proxy = os.environ.get('HTTPS_PROXY')
	proxy_exceptions = os.environ.get('NO_PROXY')

	if http_proxy is not None:
		logger.debug("HTTP proxy: %s" % http_proxy)
	if https_proxy is not None:
		logger.debug("HTTPS proxy: %s" % https_proxy)
	if proxy_exceptions is not None:
		logger.debug("Proxy Exceptions: %s" % proxy_exceptions)

	config = args.get('configuration')
	session_key = args.get('session_key')

	# Get the REST endpoint for the search so we can query it later
	search_uri = args.get('search_uri')
	# Splunkd URI (default service on tcp/8089)
	server_uri = args.get('server_uri')

	logger.debug("Imported config: %s" % config)
	logger.debug(args)

	try:
		cfg = cli.getConfStanza('hep','hec')
		hec_token = cfg['hec_token']
		hec_host = cfg['hec_host']
		hec_port = cfg['hec_port']
		hec_ssl = cfg['hec_ssl']
	except BaseException as e:
		logger.critical("Error reading target server configuration: " + repr(e))
		exit(1)

	# Special event key fields that can be specified/overridden in the alert action
	meta_keys = ['source', 'sourcetype', 'host', 'index']
	
	# Parse results CSV file directly
	search_output_file = args.get('results_file')
	results = CsvResultParser(search_output_file).getResults()['fields']

	# Make sure Splunk didn't feed us substituted values for all events from event #1
	# Query the REST API for the search endpoint
	url = server_uri + search_uri + '?output_mode=json'
	logger.debug("Connecting to URL: %s" % url)

	# Get the configuration of the search from the server
	rest_content, rest_resp = helpers.request('GET', url, '', {'Authorization': 'Splunk %s' % session_key, 'Accept': 'application/json'})
	logger.debug("REST response: %s" % str(rest_resp))

	rest_content = json.loads(rest_content)
	rest_content = rest_content['entry'][0]['content']
	#logger.debug("REST content: %s" % json.dumps(rest_content))

	# Parse the real alert action config arguments for variables from the saved search
	# Create a dict with field:value pairs, e.g. source:source (target field:source data/search results field name)
	output_meta_fromevent = {}
	for k in meta_keys:
		okey = 'action.hep.param.output_' + k
		if okey in list(rest_content.keys()):
			#logger.debug("REST response okey field " + okey + " is " + rest_content[okey])
			if '$result.' in rest_content[okey] or rest_content[okey] == "$name$" or rest_content[okey] == "$savedsearch_name$":
				output_meta_fromevent[k] = rest_content[okey].replace("$", "").replace("result.", "")
	
	logger.debug("Source event meta fields: %s" % output_meta_fromevent)
	logger.debug("Search results: %s" % json.dumps(results))
	
	# Create HEC object
	hec = http_event_collector(hec_token, hec_host, http_event_port=hec_port, http_event_server_ssl=hec_ssl)

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
			# Output key
			okey = 'output_'+ k
			# If the event contains a meta field
			if k in list(event.keys()):
				# If we found it had a variable defined within it (e.g. $result.sourcetype$)
				if k in list(output_meta_fromevent.keys()):
					# Field is in the event and in the alert action config. Use the alert action config value.
					# Find variables to substitute
					#logger.debug("Checking for %s field in event" % output_meta_fromevent[k])
					if output_meta_fromevent[k] == "savedsearch_name" or output_meta_fromevent[k] == "name":
						payload.update({ k: savedsearch_name })
					else:
						payload.update({ k: event[output_meta_fromevent[k]] })
				else:
					# Field is in the event but not in the alert action config. Use the event value.
					payload.update({ k: event[k] })
				# Delete the field from the event, so it's not duplicated in the payload under the "event" field.
				del(event[k])
			elif okey in list(config.keys()):
				# Static values from the alert action config, or other non-result variables like $name$
				payload.update({ k: config[okey] })
				#logger.debug("%s set to %s" % (k, config[okey]))

		if not "host" in list(event.keys()):
			payload.update({ "host": args['server_host'] })

		# Only send _raw if the _raw field was included in the search result.
		# (Don't include other fields/values)
		if '_raw' in list(event.keys()):
			#logger.info("Using _raw from search result")
			payload.update({ "event": event['_raw'] })
		else:
			payload.update({ "event": event })

		logger.debug("Payload: %s" % payload)
		hec.batchEvent(payload)

	hec.flushBatch()
	logger.info("Successfully pushed events. count=%s target=%s app=%s savedsearch=\"%s\" user=%s" % (len(results), hec_host, app, savedsearch_name, owner))

