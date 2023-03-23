# Splunk AppInspect complains when this file is configured with the correct default stanza definitions.

[<stanza name>]
action.alert_ep_hec = [0|1]
action.alert_ep_hec.param.output_source = <string>
action.alert_ep_hec.param.output_sourcetype = <string>
action.alert_ep_hec.param.output_index = <string>
action.alert_ep_hec.param.output_host = <string>

action.alert_ep_aws_s3 = [0|1]
action.alert_ep_aws_s3.param.dest_guid = <string>
action.alert_ep_aws_s3.param.bucket = <string>
action.alert_ep_aws_s3.param.outputfile = <string>
action.alert_ep_aws_s3.param.outputformat = <string>
action.alert_ep_aws_s3.param.fields = <string>
action.alert_ep_aws_s3.param.compress = <string>

action.alert_ep_azure_blob = [0|1]
action.alert_ep_azure_blob.param.dest_guid = <string>
action.alert_ep_azure_blob.param.container = <string>
action.alert_ep_azure_blob.param.append = [0|1]
action.alert_ep_azure_blob.param.outputfile = <string>
action.alert_ep_azure_blob.param.outputformat = <string>
action.alert_ep_azure_blob.param.fields = <string>
action.alert_ep_azure_blob.param.compress = <string>

action.alert_ep_box = [0|1]
action.alert_ep_box.param.dest_guid = <string>
action.alert_ep_box.param.outputfile = <string>
action.alert_ep_box.param.outputformat = <string>
action.alert_ep_box.param.fields = <string>
action.alert_ep_box.param.compress = <string>

action.alert_ep_smb = [0|1]
action.alert_ep_smb.param.dest_guid = <string>
action.alert_ep_smb.param.outputfile = <string>
action.alert_ep_smb.param.outputformat = <string>
action.alert_ep_smb.param.fields = <string>
action.alert_ep_smb.param.compress = <string>

action.alert_ep_sftp = [0|1]
action.alert_ep_sftp.param.dest_guid = <string>
action.alert_ep_sftp.param.outputfile = <string>
action.alert_ep_sftp.param.outputformat = <string>
action.alert_ep_sftp.param.fields = <string>
action.alert_ep_sftp.param.compress = <string>
