#!/usr/bin/env python

# Copyright 2023 Deductiv Inc.
# search_ep_hec.py
# Export Splunk events to Splunk HEC over JSON - Search Command
#
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.2.2 (2023-03-15)

import sys
import os
import time
import json
from deductiv_helpers import setup_logger, \
	str2bool, \
	search_console, \
	replace_object_tokens, \
	recover_parameters, \
	request, \
	is_cloud, \
	log_proxy_settings
from ep_helpers import get_config_from_alias
from splunk.clilib import cli_common as cli
from splunk.rest import simpleRequest

# Add lib folders to import path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from CsvResultParser import *
from splunklib.searchcommands import StreamingCommand, dispatch, Configuration, Option
# https://github.com/georgestarcher/Splunk-Class-httpevent
from splunk_http_event_collector.http_event_collector import http_event_collector   

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

	def stream(self, events):
		if getattr(self, 'first_chunk', True):
			setattr(self, 'first_chunk', False)
			first_chunk = True
		else:
			first_chunk = False
		
		try:
			app_config = cli.getConfStanza('ep_general','settings')
			cmd_config = cli.getConfStanzas('ep_hec')
		except BaseException as e:
			raise Exception("Could not read configuration: " + repr(e))
		
		# Facility info - prepended to log lines
		facility = os.path.basename(__file__)
		facility = os.path.splitext(facility)[0]
		logger = setup_logger(app_config["log_level"], 'export_everything.log', facility)
		ui = search_console(logger, self)

		# Enumerate settings
		searchinfo = self._metadata.searchinfo
		app = searchinfo.app
		user = searchinfo.username
		session_key = self._metadata.searchinfo.session_key

		if first_chunk:
			logger.info('HEC Export search command initiated')
			logger.debug('search_ep_hec command: %s', self)  # logs command line
			log_proxy_settings(logger)

			default_values = [None, '', '__default__']
			# Set defaults
			if self.host in default_values:
				self.host = "$host$"
		
			# If the parameters are not supplied or blank (alert actions), supply defaults
			if self.source in default_values:
				self.source = "$source$"

			if self.sourcetype in default_values:
				self.sourcetype = "$sourcetype$"

			if self.index in default_values:
				self.index = "$index$"

			if self.target is None and 'target=' in str(self):
				recover_parameters(self)
			# Replace all tokenized parameter strings
			replace_object_tokens(self)
			
			try:
				setattr(self, 'target_config', get_config_from_alias(session_key, cmd_config, self.target, log=first_chunk))
				if self.target_config is None:
					ui.exit_error("Unable to find target configuration (%s)." % self.target)

				logger.debug("Target configuration: " + str(self.target_config))
				hec_token = self.target_config['token']
				hec_host = self.target_config['host']
				hec_port = self.target_config['port']
				hec_ssl = str2bool(self.target_config['ssl'])
				hec_ssl_verify = str2bool(self.target_config['ssl_verify'])
			except BaseException as e:
				ui.exit_error("Error reading target server configuration: " + repr(e))

			if len(hec_host) == 0:
				ui.exit_error("No host specified")

			# Create HEC object
			setattr(self, 'hec', http_event_collector(hec_token, hec_host, http_event_port=hec_port, http_event_server_ssl=hec_ssl))
			# Override the default logger for the HEC module
			self.hec.log = logger

			try:
				if hec_ssl:
					protocol = "https"
					self.hec.SSL_verify = hec_ssl_verify
				else:
					protocol = "http"
				test_url = "%s://%s:%s/services/collector/health" % (protocol, hec_host, hec_port)
				test_response, test_response_code = request('GET', test_url, '', {}, verify=hec_ssl_verify, is_cloud=is_cloud(session_key))
				if test_response_code == 200:
					logger.debug(f"Connectivity check passed to host={hec_host}:{hec_port} with ssl_verify={hec_ssl_verify}")
				else:
					test_response = test_response.decode('utf-8')
					ui.exit_error("HEC health endpoint error: %s" % test_response)
			except BaseException as e:
				ui.exit_error("Could not connect to HEC server: %s" % str(e))

			setattr(self, 'event_counter', 0)
		
		# Get the name of the server we are running on, to be used as a last-resort host value
		try:
			server_content = simpleRequest('/services/server/info?output_mode=json', sessionKey=session_key)[1]
			default_host = json.loads(server_content)['entry'][0]['content']['host']
		except:
			default_host = None

		# Special event key fields that can be specified/overridden in the alert action
		meta_keys = ['source', 'sourcetype', 'host', 'index']

		for event in events:
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

			# Define fields for the top-level payload
			for meta_key in meta_keys: # host, source, sourcetype, index
				# self.host, etc starts and ends with $
				meta_value = getattr(self, meta_key)
				if meta_value is not None and '$' in meta_value:
					# Remove the '$result.' prefix in case it was provided
					meta_value = meta_value.replace("$result.", "$")
					# For each field in the event, make a token out of the field name like $fieldname$
					for event_field, event_field_value in list(payload_event_src.items()):
						token_string = '$'+event_field+'$'
						# Replace any tokens that show up in the user-supplied values
						if token_string in meta_value:
							meta_value = meta_value.replace(token_string, event_field_value)
							if meta_value == event_field_value and event_field in list(payload_event_src.keys()):
								# Delete meta field from the payload event source
								#  so it's not included when we dump the rest of the fields later.
								del(payload_event_src[event_field])
					# If the key field is in the event and its output argument is still set to a variable
					if meta_key == "host" and meta_value == "$host$":
						# "host" field not found in event, but has the default value. Use the one from /services/server/info
						meta_value = default_host
					payload.update({ meta_key: meta_value })
				elif len(meta_value) > 0:
					# Plain string value (not a token)
					payload.update({ meta_key: meta_value })

			# Only send _raw (no other fields) if the _raw field was included in the search result.
			# (Don't include other fields/values)
			if '_raw' in list(payload_event_src.keys()):
				# Use _raw from search result
				payload.update({ "event": payload_event_src['_raw'] })
			else:
				payload.update({ "event": payload_event_src })

			self.event_counter += 1
			
			try:
				self.hec.batchEvent(payload)
				yield(event)
			except BaseException as e:
				ui.exit_error(str(e))

		try:
			if len(self.hec.batchEvents) > 0:
				self.hec.flushBatch()
				logger.info("Successfully exported events to HEC. count=%s target=%s app=%s user=%s" % (self.event_counter, self.target, app, user))
				self.event_counter = 0
		except BaseException as e:
			ui.exit_error("Could not deliver %s events: %s" % (self.event_counter, str(e)))

dispatch(ephec, sys.argv, sys.stdin, sys.stdout, __name__)