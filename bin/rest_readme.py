"""
Access app README.md file if it exists, to render in the UI as markdown
"""

import sys
import os
from fnmatch import filter
import re
import json
import splunk.rest

# Add current directory to import path
sys.path.append(os.path.dirname(os.path.abspath(__file__))) # Special for REST endpoints

# Get the app name, apps_dir path, and app_path
apps_dir = re.sub(r'apps.*', 'apps', os.path.dirname(os.path.abspath(__file__)))
app = re.sub(r'.*apps[\\\/]([^\\\/]+).*', r'\1', os.path.dirname(os.path.abspath(__file__)))
app_dir = os.path.join(apps_dir, app)

def eprint(*args, **kwargs):
	print(*args, file=sys.stderr, **kwargs)
	
def return_error(error_text):
	error_text = re.sub(r'Exception\(|\\|\'|"', '', error_text)
	error_text = re.sub(r'\(+', '(', error_text)
	error_text = re.sub(r'\)+', ')', error_text)
	return {'error': error_text,
		'status': 500}

class Readme(splunk.rest.BaseRestHandler):

	def __init__(self, method, requestInfo, responseInfo, sessionKey):
		""" Initialize class """
		splunk.rest.BaseRestHandler.__init__(self, method, requestInfo, responseInfo, sessionKey)

	# Handle a synchronous from splunkd.
	def handle_GET(self):
		"""
		Called for a simple synchronous request.
		@param in_string: request data passed in
		@rtype: string or dict
		@return: String to return in response.  If a dict was passed in,
				it will automatically be JSON encoded before being returned.
		"""

		eprint('Started REST app_readme process')
		eprint('apps_dir = ' + apps_dir)
		eprint('app = ' + app)
		eprint('app_dir = ' + app_dir)

		# Get a directory listing for app_dir/readme*
		readme_matches = filter(os.listdir(app_dir), '[Rr][Ee][Aa][Dd][Mm][Ee]*')
		readme_files = {}
		for match in readme_matches:
			file = os.path.join(app_dir, match)
			if os.path.isfile(file):
				try:
					with open(file, mode='r') as fh:
						# Read each matching file into an entry
						# (Should only be one entry)
						readme_files[match] = fh.read()
				except Exception as e:
					eprint('Could not read file %s: %s', file, repr(e))

		result_count = len(list(readme_files.keys()))
		if result_count == 1:
			# Return the full text of the entry
			# Splunk will write this to entry[0].contents
			return list(readme_files.values())[0]
		else:
			return json.dumps(readme_files)
