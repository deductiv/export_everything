#!/usr/bin/env python

# Copyright 2022 Deductiv Inc.
# search_ep_hec.py
# Export Splunk events to Splunk HEC over JSON - Search Command
#
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.0.5 (2022-04-25)

import sys
import os
import time
import re
from deductiv_helpers import setup_logger, str2bool, exit_error, replace_object_tokens, recover_parameters, request, log_proxy_settings
from ep_helpers import get_config_from_alias
from splunk.clilib import cli_common as cli

# Add lib folders to import path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from CsvResultParser import *
from splunklib.searchcommands import StreamingCommand, dispatch, Configuration, Option
from splunk_http_event_collector.http_event_collector import http_event_collector   # https://github.com/georgestarcher/Splunk-Class-httpevent

# Define class and type for Splunk command
@Configuration()
class ephec(StreamingCommand):
	'''
	**Syntax:**
	search | ephec target=<target_host_alias>
			host=[host_value|$host_field$]
			source=[source_value|$source_field$]
			sourcetype=[sourcetype_value|$sourcetype_field$]
			index=[index_value|$index_field$] 

	**Description**
	Export Splunk events to an HTTP listener (such as Splunk HEC) over JSON.
	'''

	#Define Parameters
	target = Option(
		doc='''
		**Syntax:** **target=***<target_host_alias>*
		**Description:** Reference to a target HEC endpoint within the configuration
		**Default:** The target configured as "Default" within the HEC Setup page (if any)''',
		require=False)

	host = Option(
		doc='''
		**Syntax:** **host=***[host_value|$host_field$]*
		**Description:** Field or string to be assigned to the host field on the exported event
		**Default:** $host$, or if not defined, the hostname of the sending host (from inputs.conf)''',
		require=False)

	source = Option(
		doc='''
		**Syntax:** **source=***[source_value|$source_field$]*
		**Description:** Field or string to be assigned to the source field on the exported event
		**Default:** $source$, or if not defined, it is omitted''',
		require=False)

	sourcetype = Option(
		doc='''
		**Syntax:** **sourcetype=***[sourcetype_value|$sourcetype_field$]*
		**Description:** Field or string to be assigned to the sourcetype field on the exported event
		**Default:** $sourcetype$, or if not defined, json''',
		require=False)

	index = Option(
		doc='''
		**Syntax:** **index=***[index_value|$index_field$]*
		**Description:** The remote index in which to store the exported event
		**Default:** $index$, or if not defined, the remote endpoint's default.''',
		require=False)

	# Validators found @ https://github.com/splunk/splunk-sdk-python/blob/master/splunklib/searchcommands/validators.py

	#define main function
	def stream(self, events):
		try:
			app_config = cli.getConfStanza('ep_general','settings')
			cmd_config = cli.getConfStanzas('ep_hec')
		except BaseException as e:
			raise Exception("Could not read configuration: " + repr(e))
		
		# Facility info - prepended to log lines
		facility = os.path.basename(__file__)
		facility = os.path.splitext(facility)[0]
		try:
			logger = setup_logger(app_config["log_level"], 'export_everything.log', facility)
		except BaseException as e:
			raise Exception("Could not create logger: " + repr(e))

		logger.info('HEC Export search command initiated')
		logger.debug('search_ep_hec command: %s', self)  # logs command line

		# Set defaults
		if self.host is None or self.host == '':
			self.host = "$host$"
		# Get the default values used for data originating from this machine
		inputs_host = cli.getConfStanza('inputs','splunktcp')["host"]

		# If the parameters are not supplied or blank (alert actions), supply defaults
		if self.source is None or self.source == '':
			self.source = "$source$"

		if self.sourcetype is None or self.sourcetype == '':
			self.sourcetype = "$sourcetype$"

		if self.index is None or self.index == '':
			self.index = "$index$"

		log_proxy_settings(logger)

		# Enumerate settings
		searchinfo = self._metadata.searchinfo
		app = searchinfo.app
		user = searchinfo.username
		session_key = self._metadata.searchinfo.session_key
		
		if self.target is None and 'target=' in str(self):
			recover_parameters(self)
		# Replace all tokenized parameter strings
		replace_object_tokens(self)
		
		try:
			target_config = get_config_from_alias(session_key, cmd_config, self.target)
			if target_config is None:
				exit_error(logger, "Unable to find target configuration (%s)." % self.target, 100937)

			logger.debug("Target configuration: " + str(target_config))
			hec_token = target_config['token']
			hec_host = target_config['host']
			hec_port = target_config['port']
			hec_ssl = str2bool(target_config['ssl'])
		except BaseException as e:
			exit_error(logger, "Error reading target server configuration: " + repr(e), 124812)

		if len(hec_host) == 0:
			exit_error(logger, "No host specified", 119371)

		# Create HEC object
		hec = http_event_collector(hec_token, hec_host, http_event_port=hec_port, http_event_server_ssl=hec_ssl)
		try:
			protocol = "https" if hec_ssl else "http"
			test_url = "%s://%s:%s/services/collector/health" % (protocol, hec_host, hec_port)
			test_response, test_response_code = request('GET', test_url, '', {})
			if test_response_code == 200:
				hec_ok = True
			else:
				hec_ok = False
				test_response = test_response.decode('utf-8')
		except BaseException as e:
			exit_error(logger, "Could not connect to HEC server: %s" % str(e), 1384185)

		if hec_ok:
			logger.debug("Connectivity check passed")
			# Special event key fields that can be specified/overridden in the alert action
			meta_keys = ['source', 'sourcetype', 'host', 'index']
			event_count = 0
			for event in events:

				logger.debug("event")
				# Get the fields list for the event
				event_keys = list(event.keys())

				payload = {}
				payload_event_src = {}
				# Copy event to new event, so we can change it
				for f in event_keys:
					payload_event_src[f] = event[f]

				if '_time' in event_keys:
					payload.update({ "time": payload_event_src['_time'] })
					del(payload_event_src['_time'])
				else:
					payload.update({ "time": time.time() })

				for k in meta_keys: # host, source, sourcetype, index
					# self.host, etc starts and ends with $
					meta_value = getattr(self, k)
					logger.debug("Meta value(1) = %s", meta_value)
					#if len(getattr(self, k))>0 and getattr(self, k)[0] == "$" and getattr(self, k)[-1] == "$":
					if meta_value is not None and '$' in meta_value:
						meta_value = meta_value.replace("$result.", "$")
						logger.debug("Meta value(2) = %s", meta_value)
						#extracted_tokens = re.findall(r'(\$(?:result.)?([^$]+)\$)', meta_value)
						#referenced_field = getattr(self, k)[1:-1]
						#referenced_field = re.sub("^result.", "", referenced_field)
						for event_field, event_field_value in list(payload_event_src.items()):
							token_string = '$'+event_field+'$'
							if token_string in meta_value:
								meta_value = meta_value.replace(token_string, event_field_value)
								if meta_value == event_field_value and event_field in list(payload_event_src.keys()):
									# Delete meta field from the payload event source
									#  so it's not included when we dump the rest of the fields later.
									del(payload_event_src[event_field])
						payload.update({ k: meta_value })
						#if referenced_field in event_keys:
						#substituted_token_value = payload_event_src[referenced_field]
						# If the key field is in the event and its output argument is set to a variable
						#if k in event_keys:
						if k == "host" and self.host == "$host$":
							# "host" field not found in event, but has the default value. Use the one from inputs.conf.
							payload.update({ k: inputs_host })
					elif len(meta_value) > 0:
						# Plain string value (not a token)
						payload.update({ k: meta_value })

				# Only send _raw (no other fields) if the _raw field was included in the search result.
				# (Don't include other fields/values)
				if '_raw' in list(payload_event_src.keys()):
					#logger.debug("Using _raw from search result")
					payload.update({ "event": payload_event_src['_raw'] })
				else:
					payload.update({ "event": payload_event_src })

				event_count += 1
				logger.debug("Payload = " + str(payload))
				hec.batchEvent(payload)
				yield(event)

			hec.flushBatch()
			logger.info("Successfully exported events. count=%s target=%s app=%s user=%s" % (event_count, self.target, app, user))
		else:
			exit_error(logger, "HEC health endpoint error: %s" % test_response, 100253)
dispatch(ephec, sys.argv, sys.stdin, sys.stdout, __name__)