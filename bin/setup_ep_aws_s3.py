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
options = ['stanza', 'default', 'alias', 'default_s3_bucket', 'region',
	'credential', 'use_arn', 'access_key_id', 'endpoint_url', 'compress']

handler = SetupApp(admin.ARG_SETUP, admin.CONTEXT_APP_AND_USER, log_level, 'ep_aws_s3', options)
info = admin.ConfigInfo()
if sys.argv[1] == 'setup':
	handler.setup()
elif sys.argv[1] == 'execute':
    handler.execute(info)
admin.stdout_write(handler.toXml(info))
