#!/usr/bin/env python

#from __future__ import absolute_import, division, print_function, unicode_literals
import sys, os
# Add lib folders to import path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from splunklib.searchcommands import ReportingCommand, dispatch, Configuration, Option, validators

@Configuration(requires_preop=False)
class eptestCommand(ReportingCommand):

	@Configuration()
	def map(self, events):
		for e in events:
			yield(e)

	def reduce(self, events):
		for e in events:
			#e["cmd_result"] = "success"
			yield(e)

dispatch(eptestCommand, sys.argv, sys.stdin, sys.stdout, __name__)