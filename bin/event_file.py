# Module to create a text file from search results using a Splunk reporting command
# event_file.py
# Write Splunk search results to a custom formatted file
#
# Copyright 2023 Deductiv Inc.
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.3.0 (2023-08-11)

import json
import fnmatch
import gzip
import copy
import deductiv_helpers as dhelp

file_extensions = {
	'raw':  '.log',
	'kv':   '.log',
	'pipe': '.log',
	'csv':  '.csv',
	'tsv':  '.tsv',
	'json': '.json'
}

delimiters = {
	'csv': ',',
	'tsv': '\t',
	'pipe': '|'
}

def annotate_last_item(gen):
	try:
		prev_val = next(gen)
	except StopIteration:
		dhelp.eprint('StopIteration hit')
		return
	for val in gen:
		yield False, prev_val
		prev_val = val
	yield True, prev_val

def flush_buffer(string_list, output_file):
	with open(output_file, "ab") as f:
		f.writelines(string_list)

def flush_buffer_gzip(string_list, output_file):
	with gzip.open(output_file, "ab") as f:
		f.writelines(string_list)

def write_events_to_file(events, fields, local_output, outputformat, compression, 
			 blankfields, internalfields, datefields, append_chunk, finish, 
			 append_data, sid):
	logger = dhelp.setup_logging('export_everything')

	if dhelp.is_search_finalizing(sid) and not finish:
		return

	# Buffer variables
	output_file_buf = []
	buffer_flush_count = 1000
	event_counter = 0

	if outputformat == 'json':
		if not append_chunk:
			output_file_buf.append('['.encode('utf-8'))
		else:
			output_file_buf.append(',\n'.encode('utf-8'))

	# Splunk internal fields
	internals = ['_bkt', '_cd', '_si', '_kv', '_serial', '_indextime', '_sourcetype', \
				'splunk_server', 'splunk_server_group', 'punct', 'linecount', '_subsecond', \
				'timestartpos', 'timeendpos', '_eventtype_color'] # eventtype, tag, tag::eventtype

	dates = ['date_second', 'date_hour', 'date_minute', 'date_year', 'date_month', \
	  			'date_mday', 'date_wday', 'date_zone']

	event_keys = []
	for last_event, event in annotate_last_item(events):
		# The search is finalizing, but we aren't on the last chunk
		# User or Splunk must have cancelled the job
		if dhelp.is_search_finalizing(sid) and not finish:
			break

		if event_keys == []:
			# Get the fields list for the event
			# Filter the fields if fields= is supplied
			if fields is not None:
				if type(fields) == str:
					fields = [fields]
				for k in list(event.keys()):
					for f in fields:
						if k == f or fnmatch.fnmatch(k, f):
							event_keys.append(k)
			else:
				event_keys = list(event.keys())
				fields = []

			# Remove the internal fields if they aren't explicitly included
			if not internalfields:
				# Filter internal fields unless explicitly specified
				for internal_field in internals:
					if internal_field in event_keys and not any(fnmatch.fnmatch(internal_field, specified_field) for specified_field in fields):
						# Remove the field from the event_keys list
						event_keys.remove(internal_field)
			
			# Remove the date fields if they aren't explicitly included
			if not datefields:
				# Filter internal fields unless explicitly specified
				for date_field in dates:
					if date_field in event_keys and not any(fnmatch.fnmatch(date_field, specified_field) for specified_field in fields):
						# Remove the field from the event_keys list
						event_keys.remove(date_field)
			
		# Pick the output format on the first event if one was not specified
		if event_counter == 0:
			if outputformat is None and '_raw' in event_keys:
				outputformat = 'raw'
			elif outputformat is None:
				outputformat = 'json'

			# Check event format setting and write a header if needed
			if outputformat == "csv" or outputformat == "tsv" or outputformat == "pipe":
				delimiter = delimiters[outputformat]
				if not append_chunk and not append_data:
					# Write header
					header = ''
					for field in event_keys:
						# Quote the string if it has a space
						if ' ' in field and outputformat == "csv":
							field = '"' + field + '"'
						# Concatenate the header field names
						header += field + delimiter
					# Strip off the last delimiter
					header = header[:-1] + '\n'
					output_file_buf.append(header.encode('utf-8'))

		output_text = ''
		# Build the row of text
		if outputformat == "raw":
			if '_raw' in event_keys:
				output_text = event["_raw"]
			else:
				logger.warning("No raw field when raw output selected.")
		elif outputformat == "csv" or outputformat == "tsv" or outputformat == "pipe":
			for key, value in list(event.items()):
				logger.debug("Key = %s, Value = %s", key, value)
				if key in event_keys:
					# Convert list to string value
					if isinstance(value, list):
						value = '"' + delimiter.join(value).replace('"', r'""') + '"'
					if outputformat == "csv":
						# Escape any double-quotes
						unquoted_value = value.strip('"')
						if '"' in unquoted_value:
							# String has a quotation mark. Quote it and escape those inside.
							value = dhelp.escape_quotes_csv(unquoted_value)
							value = '"' + value + '"'
						# Quote the string if it has a space or separator
						elif ' ' in unquoted_value or ',' in unquoted_value:
							value = '"' + unquoted_value + '"'
					
					output_text += value + delimiter
			output_text = output_text[:-1]
		elif outputformat == "kv":
			for key, value in list(event.items()):
				value = str(value)
				if key in event_keys:
					# Escape any double-quotes
					if '"' in value:
						# String has a quotation mark. Quote it and escape those inside.
						value = dhelp.escape_quotes(value)
						value = '"' + value + '"'
					# Quote the string if it has a space or separator
					elif ' ' in value or '=' in value:
						value = '"' + value + '"'
					if blankfields or value != "":
						output_text += key + "=" + value + ' '
		elif outputformat == "json":
			if fields is not None or not blankfields:
				json_event = {}
				for key in event_keys:
					try:
						if blankfields or event[key] != "":
							json_event[key] = event[key]
					except BaseException as e:
						logger.debug("Exception writing field %s with value %s to output: %s", key, event[key], str(e))
			else:
				json_event = copy.deepcopy(event)
			try:
				output_text = json.dumps(json_event)
				if not last_event:
					output_text +=  ','
			except BaseException as e:
				logger.debug("Exception writing event to output: %s\n\t%s", str(e), json_event)

		# Append entry to the lists
		output_file_buf.append(output_text.encode('utf-8'))
		# Append a newline for each record, except the last json record
		# This helps for appending to non-json files later, if needed
		if outputformat in ['pipe', 'csv', 'tsv', 'kv', 'raw'] or (outputformat == 'json' and not last_event):
			output_file_buf.append('\n'.encode('utf-8'))
		
		event_counter += 1

		# Time to flush the buffers
		if len(output_file_buf) == buffer_flush_count:
			if compression:
				flush_buffer_gzip(output_file_buf, local_output)
			else:
				flush_buffer(output_file_buf, local_output)
			output_file_buf = []

		yield(event)

	# Make changes to the event for append_chunk=True or finish=True/None
	if outputformat == 'json':
		if isinstance(output_file_buf[-1], str):
			#dhelp.eprint(output_file_buf[-1])
			output_file_buf[-1] = output_file_buf[-1].replace(',\n', '\n').encode('utf-8')
		elif isinstance(output_file_buf[-1], bytes):
			#dhelp.eprint(output_file_buf[-1])
			output_file_buf[-1] = output_file_buf[-1].decode('utf-8').replace(',\n', '\n').encode('utf-8')
		if finish or finish is None:
			output_file_buf.append(']'.encode('utf-8'))

	if compression:
		flush_buffer_gzip(output_file_buf, local_output)
	else:
		flush_buffer(output_file_buf, local_output)
	output_file_buf = None
	logger.debug("Wrote temp output file " + local_output)
		
def parse_outputfile(outputfile, default_filename, target_config):

	# PSEUDO CODE
	# Leading / = use the root folder
	# No leading / = use default folder
	# Has 1 or more / (not leading) = use root or default + path given
	# Trailing / = use default filename

	folder_list = []
	# Split the output into folder and filename
	if outputfile is not None and outputfile != '__default__' and outputfile != '':
		outputfile = outputfile.replace('\\', '/')
		if len(outputfile) > 0 and outputfile[0] == '/':
			# Length > 1, outputfile points to the root folder (leading /)
			use_default_folder = False
		else:
			# outputfile points to a relative path (no leading /)
			use_default_folder = True
		
		if (use_default_folder == False and outputfile[0] == '/') or \
			(use_default_folder and 'default_folder' in list(target_config.keys()) and \
				len(target_config["default_folder"].strip()) > 0):
			use_leading_slash = True
		else:
			use_leading_slash = False

		outputfile = outputfile.lstrip('/')
		if '/' in outputfile: # Not leading
			folder_list = outputfile.split('/')
			if folder_list[-1] == '':
				# No filename provided, trailing /
				filename = default_filename
				# Purge the last (empty-string) entry
				folder_list.pop()
			else:
				filename = folder_list.pop()
		elif len(outputfile) > 0:
			filename = outputfile
		else:
			# Folder set as /, no filename
			filename = default_filename
	else:
		use_default_folder = True
		filename = default_filename
	
	if use_default_folder:
		if 'default_folder' in list(target_config.keys()) and len(target_config["default_folder"].strip()) > 0:
			# Use the configured default folder
			default_folder = target_config['default_folder'].replace('\\', '/')
			folder_list = default_folder.strip('/').split('/') + folder_list
			if default_folder[0] == '/':
				use_leading_slash = True
			else:
				use_leading_slash = False
		else:
			# No folder specified or blank
			use_leading_slash = False
	
	# Replace keywords from output filename and folder
	#folder = dhelp.replace_keywords('/'.join(folder_list))
	if use_leading_slash:
		folder = '/'+('/'.join(folder_list))
	else:
		folder = '/'.join(folder_list)

	folder = dhelp.replace_keywords(folder)
	filename = dhelp.replace_keywords(filename)

	return [folder, filename]
