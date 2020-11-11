#!/usr/bin/env python
# Python 2 and 3 compatible
# hep_search.py
# Push Splunk events to an HTTP listener (such as Splunk HEC) over JSON - Search Command
#
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 1.1.3 (2020-11-11)

from __future__ import print_function
from future import standard_library
standard_library.install_aliases()
import logging
import sys, os
import time
import socket

# Add lib folders to import path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
# pylint: disable=import-error
from splunk.clilib import cli_common as cli
import splunklib.client as client
import splunklib.results as results
from splunklib.searchcommands import StreamingCommand, dispatch, Configuration, Option, validators
from CsvResultParser import *
from deductiv_helpers import setup_logger, eprint, str2bool

# Use the library from George Starcher for HTTP Event Collector
# Updated to support Python3
from splunk_http_event_collector.http_event_collector import http_event_collector   # https://github.com/georgestarcher/Splunk-Class-httpevent

def port_is_open(ip, port):
	s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
	try:
		s.connect((ip, int(port)))
		s.shutdown(2)
		return True
	except:
		return False
	  
# Define class and type for Splunk command
@Configuration(local=True)
class hep(StreamingCommand):
	doc='''
	**Syntax:**
	search | hep host=[host_value|$host_field$]
			source=[source_value|$source_field$]
			sourcetype=[sourcetype_value|$sourcetype_field$]
			index=[index_value|$index_field$] 

	**Description**
	Push Splunk events to an HTTP listener (such as Splunk HEC) over JSON.
	'''

	#Define Parameters
	host = Option(
		doc='''
		**Syntax:** **host=***[host_value|$host_field$]*
		**Description:** Field or string to be assigned to the host field on the pushed event
		**Default:** $host$, or if not defined, the hostname of the sending host (from inputs.conf)''',
		require=False)

	source = Option(
		doc='''
		**Syntax:** **source=***[source_value|$source_field$]*
		**Description:** Field or string to be assigned to the source field on the pushed event
		**Default:** $source$, or if not defined, it is omitted''',
		require=False)

	sourcetype = Option(
		doc='''
		**Syntax:** **sourcetype=***[sourcetype_value|$sourcetype_field$]*
		**Description:** Field or string to be assigned to the sourcetype field on the pushed event
		**Default:** $sourcetype$, or if not defined, json''',
		require=False)

	index = Option(
		doc='''
		**Syntax:** **index=***[index_value|$index_field$]*
		**Description:** The remote index in which to store the pushed event
		**Default:** $index$, or if not defined, the remote endpoint's default.''',
		require=False) 

	# Validators found @ https://github.com/splunk/splunk-sdk-python/blob/master/splunklib/searchcommands/validators.py

	def __getitem__(self, key):
		return getattr(self,key)

	#define main function
	def stream(self, events):
		try:
			cfg = cli.getConfStanza('hep','settings')
		except BaseException as e:
			raise Exception("Could not read configuration: " + repr(e))
		
		# Facility info - prepended to log lines
		facility = os.path.basename(__file__)
		facility = os.path.splitext(facility)[0]
		try:
			logger = setup_logger(cfg["log_level"], 'hep.log', facility)
		except BaseException as e:
			raise Exception("Could not create logger: " + repr(e))

		logger.info('HEP search command initiated')

		# Set defaults
		if self.host is None:
			self.host = "$host$"
		# Get the default values used for data originating from this machine
		inputs_host = cli.getConfStanza('inputs','splunktcp')["host"]

		if self.source is None:
			self.source = "$source$"

		if self.sourcetype is None:
			self.sourcetype = "$sourcetype$"

		if self.index is None:
			self.index = "$index$"

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

		# Enumerate settings
		session_key = self._metadata.searchinfo.session_key
		splunkd_uri = self._metadata.searchinfo.splunkd_uri
		app = self._metadata.searchinfo.app
		user = self._metadata.searchinfo.username
		owner = self._metadata.searchinfo.owner
		dispatch = self._metadata.searchinfo.dispatch_dir

		try:
			cfg = cli.getConfStanza('hep','hec')
			#logger.debug(str(cfg))
			hec_token = cfg['hec_token']
			hec_host = cfg['hec_host']
			hec_port = cfg['hec_port']
			hec_ssl = cfg['hec_ssl']
		except BaseException as e:
			logger.critical("Error reading target server configuration: " + repr(e))
			raise Exception("Error reading target server configuration: " + repr(e))

		if len(hec_host) == 0:
			logger.critical("No host specified. Exiting.")
			raise Exception("No host specified")

		if port_is_open(hec_host, hec_port):
			# Create HEC object
			hec = http_event_collector(hec_token, hec_host, http_event_port=hec_port, http_event_server_ssl=hec_ssl)

			# Special event key fields that can be specified/overridden in the alert action
			meta_keys = ['source', 'sourcetype', 'host', 'index']
			event_count = 0
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

				for k in meta_keys:
					# Loop through the metadata keys: host/source/sourcetype/index
					if getattr(self, k)[0] == getattr(self, k)[-1] and getattr(self, k)[-1] == "$":
						if k in event_keys:
							# If the key field is in the event and its output argument is set to a variable
							payload.update({ k: payload_event_src[getattr(self, k)[1:-1]] })
							# Delete it from the payload event source so it's not included when we dump the rest of the fields later.
							del(payload_event_src[getattr(self, k)[1:-1]])
						elif k == "host" and self.host == "$host$":
							# "host" field not found in event, but has the default value. Use the one from inputs.conf.
							payload.update({ k: inputs_host })
					else:
						# Plaintext entry
						payload.update({ k: self[k] })

				# Only send _raw (no other fields) if the _raw field was included in the search result.
				# (Don't include other fields/values)
				if '_raw' in list(payload_event_src.keys()):
					logger.debug("Using _raw from search result")
					payload.update({ "event": payload_event_src['_raw'] })
				else:
					payload.update({ "event": payload_event_src })

				event_count += 1
				hec.batchEvent(payload)
				yield(event)

			hec.flushBatch()
			logger.info("Successfully pushed events. count=%s target=%s app=%s user=%s" % (event_count, hec_host, app, user))
		else:
			if str2bool(hec_ssl):
				protocol = 'https'
			else:
				protocol = 'http'
			logger.critical("Unable to connect to the HEC endpoint: %s" % protocol+'://'+hec_host+':'+hec_port)
			raise Exception("Unable to connect to the HEC endpoint: %s" % protocol+'://'+hec_host+':'+hec_port)
dispatch(hep, sys.argv, sys.stdin, sys.stdout, __name__)
