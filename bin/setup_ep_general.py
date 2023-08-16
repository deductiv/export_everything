#!/usr/bin/env python

# Copyright 2023 Deductiv Inc.
# REST endpoint for configuration
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.2.3 (2023-08-11)

import splunk.admin as admin
from splunk.clilib import cli_common as cli
from setup_ep import SetupApp
import sys

log_level = cli.getConfStanza('ep_general', 'settings')["log_level"]
options = ['stanza', 'log_level']

handler = SetupApp(admin.ARG_SETUP, admin.CONTEXT_APP_AND_USER, log_level, 'ep_general', options)
info = admin.ConfigInfo()
if sys.argv[1] == 'setup':
	handler.setup()
elif sys.argv[1] == 'execute':
    handler.execute(info)
admin.stdout_write(handler.toXml(info))
