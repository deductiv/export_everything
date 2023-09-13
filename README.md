# ![App icon](/static/appIcon.png) Export Everything - Splunk Add-On by Deductiv  

This add-on exports your Splunk search results to remote destinations so you can do more with your Splunk data. It provides search commands and alert actions to export/push/upload/share your data to multiple destinations of each type. The app must be configured via the Setup dashboard before using it. The setup dashboard includes a connection test feature in the form of a "**Browse**" action for all file-based destinations.

## Supported Export Formats
- JSON
- Raw Text
- Key-Value Pairs
- Comma-Delimited (CSV)
- Tab-Delimited (TSV)
- Pipe-Delimited

## File-Based Destinations  
- Amazon Web Services (AWS) S3-Compatible Object Storage (S3, Google Cloud Storage, MinIO, et al.)  
- Azure Blob & Data Lake v2 Storage  
- Box.com Cloud Storage  
- SFTP Servers  
- Windows/SMB File Shares  

## Streaming Destinations  
- Splunk HTTP Event Collector (including Cribl Stream)  
___
# Support  

We offer paid **Commercial Support** for Export Everything and our other published Splunk apps using [GitHub Sponsors](https://github.com/sponsors/deductiv) or through a direct support agreement. [Contact us](mailto:contact@deductiv.net) for more information.  
    
Free community support is also available, but **not recommended for production** use cases. In the event of an issue, [email us](mailto:contact@deductiv.net) and we'll help you sort it out. You can also [reach the author](https://splunk-usergroups.slack.com/team/U30E9LS79) on the Splunk Community Slack.  

## Features  

We welcome your feature requests, which can be submitted as issues on [GitHub](https://github.com/deductiv/export_everything/issues). Paid support customers have priority feature requests.  
  
___
## Credential Management  
Use the Credentials tab to manage usernames, passwords, and passphrases (used for private keys) within the Splunk secret store. Certain use cases (such as private key logins) may not require a password, but Splunk requires one to be entered anyway. For passphrases, type any description into the username field. OAuth credentials such as those for AWS use the username field for the access key and the password field for the secret access key. Due to the way Splunk manages credentials, the username field cannot be changed once it is saved.  

## Authorization via Capabilities  
Add read capabilities for each command to users who require access to use the search command or alert action. Add write capability to allow them to make changes to the configuration. By default, admin/sc_admin has full access and power has read-only access. Credential permissions must be granted separately, but are required to use each command that depends on them.  

## Keywords for Output Filenames  
All file-based destinations support keywords for the output filenames. The keywords have double underscores before and after.  The keyword replacements are based on Python expressions, so we can add more as they are requested. Those currently available are shown below:  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`__now__` = epoch  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`__nowms__` = epoch value in milliseconds  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`__nowft__` = timestamp in yyyy-mm-dd_hhmmss format  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`__today__` = date in yyyy-mm-dd format  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`__yesterday__` = yesterday's date in yyyy-mm-dd format  
  
## Common Arguments  
The following arguments are common to **all** search commands in this app:  
- #### Target  
    **Syntax:** `target=<target name/alias>`  
    **Description:** The name/alias of the destination connection  
    **Default:** The target specified as the default within the setup dashboard  
## Common File-Based Command Arguments  
The following arguments are common to search commands with **file-based** destinations in this app:  
- #### Output File
    **Syntax:** `outputfile=<[folder/]file name>`  
    **Description:** The name of the file to be written to the destination. If compression=true, a .gz extension will be appended. If compression is not specified and the filename ends in .gz, compression will automatically be applied. **Keyword replacements** are supported (see above).
    **Default:** `app_username___now__.ext` (e.g. `search_admin_1588000000.log`).  json=.json, csv=.csv, tsv=.tsv, pipe=.log, kv=.log, raw=.log  
&nbsp;  
- #### Output Format
    **Syntax:** `outputformat=[json|raw|kv|csv|tsv|pipe]`  
    **Description:** The format for the exported search results  
    **Default:** *csv*  
&nbsp;  
- #### Fields
    **Syntax:** `fields="field1, field2, field3"`  
    **Description:** Limit the fields to be written to the exported file. Wildcards are supported.  
    **Default:** All (*)  
&nbsp;  
- #### Blank Fields
    **Syntax:** `blankfields=[true|false]`  
    **Description:** Include blank fields in the output. Applies to JSON and KV output modes.  
    **Default:** False  
&nbsp;  
- #### Internal Fields
    **Syntax:** `internalfields=[true|false]`  
    **Description:** Include Splunk internal fields in the output. Individual fields can be overridden with _fields_.  Currently these include: _bkt, _cd, _si, _kv, serial, _indextime, _sourcetype, splunk_server, splunk_server_group, punct, linecount, _subsecond, timestartpos, timeendpos, _eventtype_color  
    **Default:** False  
&nbsp;  
- #### Date Fields
    **Syntax:** `datefields=[true|false]`  
    **Description:** Include the default date_* fields in the output. Individual fields can be overridden with _fields_.  
    **Default:** False  
&nbsp;  
- #### Compression
    **Syntax:** `compress=[true|false]`  
    **Description:** Create the file as a .gz compressed archive  
    **Default:** Specified within the target configuration  
___
## AWS S3-Compatible Object Storage Export (epawss3)

Export Splunk search results to AWS S3-compatible object storage. Connections can be configured to authenticate using OAuth credentials or the assumed role of the search head EC2 instance.  

### Capabilities  
- configure_ep_aws_s3_read  
- configure_ep_aws_s3_write  

### Search Command Syntax  
```
<search> | epawss3  
        target=<target name/alias>  
        bucket=<bucket>  
        outputfile=<output path/filename>  
        outputformat=[json|raw|kv|csv|tsv|pipe]  
        fields="<comma-delimited fields list>"  
        blankfields=[true|false]  
        internalfields=[true|false]  
        datefields=[true|false]  
        compress=[true|false]  
```  

### Arguments  
- #### Bucket  
    **Syntax:** `bucket=<bucket name>`  
    **Description:** The name of the destination S3 bucket  
    **Default:** Specified within the target configuration  

___
## Azure Blob Storage Export (epazureblob)

Export Splunk search results to Azure Blob or Data Lake v2 object storage. Configure connections to authenticate using storage account keys or Azure Active Directory app credentials.  

### Capabilities  
- configure_ep_azure_blob_read  
- configure_ep_azure_blob_write  

### Search Command Syntax  
```
<search> | epazureblob  
        target=<target name/alias>  
        container=<container name>  
        outputfile=<output path/filename>  
        outputformat=[json|raw|kv|csv|tsv|pipe]  
        fields="<comma-delimited fields list>"  
        blankfields=[true|false]  
        internalfields=[true|false]  
        datefields=[true|false]  
        compress=[true|false]  
        append=[true|false]  
```
### Arguments  
- #### Container  
    **Syntax:** `container=<container name>`  
    **Description:** The name of the destination container  
    **Default:** Specified within the target configuration  
&nbsp;  
- #### Append
    **Syntax:** `append=[true|false]`  
    **Description:** Append the search results to an existing AppendBlob object. This setting will omit output headers for CSV, TSV, and Pipe-delimited output formats. Does not support JSON or compressed (gz) file types.  
    **Default:** false (overwrite)

___
## Box Export (epbox)  

Export Splunk search results to Box cloud storage. Box must be configured with a Custom App using Server Authentication (with JWT) and a certificate generated. Then, the app must be submitted for approval by the administrator. The administrator should create a folder within the app's account and share it with the appropriate users.  

### Capabilities  
- configure_ep_box_read  
- configure_ep_box_write  

### Search Command Syntax  
```
<search> | epbox  
        target=<target name/alias>  
        outputfile=<output path/filename>  
        outputformat=[json|raw|kv|csv|tsv|pipe]  
        fields="<comma-delimited fields list>"  
        blankfields=[true|false]  
        internalfields=[true|false]  
        datefields=[true|false]  
        compress=[true|false]  
```

___
## SFTP Export (epsftp)  

Export Splunk search results to SFTP servers.  

### Capabilities  
- configure_ep_sftp_read  
- configure_ep_sftp_write  

### Search Command Syntax  
```
<search> | epsftp  
        target=<target name/alias>  
        outputfile=<output path/filename>  
        outputformat=[json|raw|kv|csv|tsv|pipe]  
        fields="<comma-delimited fields list>"  
        blankfields=[true|false]  
        internalfields=[true|false]  
        datefields=[true|false]  
        compress=[true|false]  
```

___
## Windows/SMB Export (epsmb)  

Export Splunk search results to SMB file shares.  

### Capabilities  
- configure_ep_smb_read  
- configure_ep_smb_write  

### Search Command Syntax  
```
<search> | epsmb  
        target=<target name/alias>  
        outputfile=<output path/filename>  
        outputformat=[json|raw|kv|csv|tsv|pipe]  
        fields="<comma-delimited fields list>"  
        blankfields=[true|false]  
        internalfields=[true|false]  
        datefields=[true|false]  
        compress=[true|false]  
```

___
## Splunk HEC Export (ephec)  

Stream Splunk search results to a Splunk HTTP Event Collector (HEC) or Cribl Stream HEC endpoint.  

### Capabilities  
- configure_ep_hec_read  
- configure_ep_hec_write  

### Search Command Syntax  
```
<search> | ephec  
        target=<target name/alias>  
        host=[host_value|$host_field$]  
        source=[source_value|$source_field$]  
        sourcetype=[sourcetype_value|$sourcetype_field$]  
        index=[index_value|$index_field$]  
```

### Arguments  
- #### Host  
    **Syntax:** `host=[host_value|$host_field$]`  
    **Description:** Field or string to be assigned to the host field on the pushed event  
    **Default:** $host$, or if not defined, the hostname of the sending host (from inputs.conf)  
&nbsp;  
- #### Source  
    **Syntax:** `source=[source_value|$source_field$]`  
    **Description:** Field or string to be assigned to the source field on the pushed event  
    **Default:** $source$, or if not defined, it is omitted  
&nbsp;  
- #### Sourcetype  
    **Syntax:** `sourcetype=[sourcetype_value|$sourcetype_field$]`  
    **Description:** Field or string to be assigned to the sourcetype field on the pushed event  
    **Default:** $sourcetype$, or if not defined, json  
&nbsp;  
- #### Index  
    **Syntax:** `index=[index_value|$index_field$]`  
    **Description:** The remote index in which to store the pushed event  
    **Default:** $index$, or if not defined, the remote endpoint's default.  
  
___
## Binary File Declaration
The following binaries are written in C and required by multiple python modules used within this app:
- bin/lib/py3_linux_x86_64/_cffi_backend.cpython-37m-x86_64-linux-gnu.so
- bin/lib/py3_linux_x86_64/_libs_cffi_backend/libffi-806b1a9d.so.6.0.4
- bin/lib/py3_linux_x86_64/cryptography/hazmat/bindings/_padding.abi3.so
- bin/lib/py3_linux_x86_64/cryptography/hazmat/bindings/_constant_time.abi3.so
- bin/lib/py3_linux_x86_64/cryptography/hazmat/bindings/_openssl.abi3.so
- bin/lib/py3_linux_x86_64/bcrypt/_bcrypt.abi3.so
- bin/lib/py3_linux_x86_64/nacl/_sodium.abi3.so
- bin/lib/py3_win_amd64/_cffi_backend.cp37-win_amd64.pyd
- bin/lib/py3_win_amd64/cryptography/hazmat/bindings/_padding.cp37-win_amd64.pyd
- bin/lib/py3_win_amd64/cryptography/hazmat/bindings/_openssl.cp37-win_amd64.pyd
- bin/lib/py3_win_amd64/cryptography/hazmat/bindings/_constant_time.cp37-win_amd64.pyd
- bin/lib/py3_win_amd64/nacl/_sodium.cp37-win_amd64.pyd

## Library Customization
The following binaries are customized within this app to conform to Splunk AppInspect requirements:
- bin/lib/py3_linux_x86_64/_cffi_backend.cpython-37m-x86_64-linux-gnu.so - Edited to point to _libs_cffi_backend instead of .libs_cffi_backend directory
- bin/lib/pysmb/nmb/NetBIOS.py - Removed UDP socket functionality
- bin/lib/pysmb/smb/SMBConnection.py - Added support for IP address connections
