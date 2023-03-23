#!/usr/bin/env python

# Copyright 2023 Deductiv Inc.
# REST endpoint for configuration
# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.2.2 (2023-03-15)

import splunk.admin as admin
from splunk.clilib import cli_common as cli
from setup_ep import SetupApp
import sys

log_level = cli.getConfStanza('ep_general', 'settings')["log_level"]
options = ['stanza', 'default', 'alias', 'default_folder', 'enterprise_id', 
	'client_id', 'client_credential', 'public_key_id',
	'private_key', 'passphrase_credential',	'compress']

handler = SetupApp(admin.ARG_SETUP, admin.CONTEXT_APP_AND_USER, log_level, 'ep_box', options)
info = admin.ConfigInfo()
if sys.argv[1] == 'setup':
	handler.setup()
elif sys.argv[1] == 'execute':
    handler.execute(info)
admin.stdout_write(handler.toXml(info))
