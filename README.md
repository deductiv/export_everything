## Event Push - Splunk Add-On by Deductiv

This app allows you to push Splunk search results to remote destinations.  Currently supports:

- Splunk HTTP Event Collector (alert action + search command)
- Amazon Web Services (AWS) S3 Buckets (search command)


## AWS S3 Event Push Search Command (s3ep)
**Syntax:**
search | s3ep region=&lt;region&gt; bucket=&lt;bucket&gt; outputfile=&lt;output filename&gt; outputformat=[json|raw|kv|csv|tsv|pipe]

**Description**
Push Splunk events to AWS S3 over JSON or raw text.  The default AWS region and S3 bucket can be configured in the app setup page or in hep.conf directly.

**Arguments**
- #####Region
**Syntax:** region=&lt;AWS region&gt;
**Description:** The name of the AWS region where the AWS bucket lives 
**Default:** The region defined in hep.conf, aws stanza
- #####Bucket
**Syntax:** bucket=&lt;bucket name&gt;
**Description:** The name of the destination S3 bucket
**Default:** The bucket name defined in hep.conf, aws stanza
- #####Output File
**Syntax:** outputfile=&lt;[folder/]file name&gt;
**Description:** The name of the file to be written to the S3 bucket
**Default:** `app_username_epoch.ext` (e.g. `search_admin_1588000000.log`).  json=.json, csv=.csv, tsv=.tsv, pipe=.log, kv=.log, raw=.log
**Keywords:** `__now__`=epoch, `__today__`=date in yyyy-mm-dd format, `__nowft__`=timestamp in yyyy-mm-dd_hhmmss format.
- #####Output Format
**Syntax:** *outputformat=*[json|raw|kv|csv|tsv|pipe]
**Description:** The format written for the output events/search results
**Default:** *raw* if the *_raw* field is in the search, otherwise *json*
- #####Fields
**Syntax:** *fields=*"field1, field2, field3"
**Description:** Limit the fields to be written to the S3 file
**Default:** All (Unspecified)

## Splunk HEC Event Push Search Command (hep)
**Syntax:**
search | hep host=[host_value|$host_field$] source=[source_value|$source_field$] sourcetype=[sourcetype_value|$sourcetype_field$] index=[index_value|$index_field$]

**Description**
Push Splunk events to an HTTP listener (such as Splunk HEC) over JSON.

**Arguments**
- ##### Host
**Syntax:** host=[host_value|$host_field$]
**Description:** Field or string to be assigned to the host field on the pushed event
**Default:** $host$, or if not defined, the hostname of the sending host (from inputs.conf)
- ##### Source
**Syntax:** source=[source_value|$source_field$]
**Description:** Field or string to be assigned to the source field on the pushed event
**Default:** $source$, or if not defined, it is omitted
- ##### Sourcetype
**Syntax:** sourcetype=[sourcetype_value|$sourcetype_field$]
**Description:** Field or string to be assigned to the sourcetype field on the pushed event
**Default:** $sourcetype$, or if not defined, json
- ##### Index
**Syntax:** index=[index_value|$index_field$]
**Description:** The remote index in which to store the pushed event
**Default:** $index$, or if not defined, the remote endpoint's default.

### Support

Having trouble with the app? Feel free to [email us](mailto:contact@deductiv.net) and we’ll help you sort it out. You can also [reach the author](https://splunk-usergroups.slack.com/team/U30E9LS79) on the Splunk Community Slack.

### Roadmap

We welcome your input on our app feature roadmap, which can be found on [Trello](https://trello.com/b/YbFOsuKJ/deductiv-http-event-push-app-for-splunk).
