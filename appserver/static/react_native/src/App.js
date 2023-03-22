/* Copyright 2023 Deductiv Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Author: J.R. Murray <jr.murray@deductiv.net>
# Version: 2.2.2 (2022-03-15)
*/
 
const app = 'export_everything';

import React, { forwardRef, Suspense } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import { FormControl, TextField, Select, InputLabel, MenuItem } from '@material-ui/core';
import MaterialTable from '@material-table/core';
// Snackbar notifications
import { withSnackbar } from 'notistack';
// UUID for stanza name generation
import uuid from 'react-native-uuid';
import validator from 'validator';
import moment from 'moment';
import 'moment-timezone';

// Lazy load controls for the file browser UI
const FileBrowserModal = React.lazy(() => import('./FileBrowserModal'));

// Stylesheets
import 'react-tabs/style/react-tabs.css';

import Search from "@material-ui/icons/Search";
import FirstPage from "@material-ui/icons/FirstPage";
import LastPage from "@material-ui/icons/LastPage";
import ChevronRight from "@material-ui/icons/ChevronRight";
import ChevronLeft from "@material-ui/icons/ChevronLeft";
import Clear from "@material-ui/icons/Clear";
import ArrowDownward from "@material-ui/icons/ArrowDownward";
import Info from "@material-ui/icons/Info";
import Check from "@material-ui/icons/Check";
import Delete from "@material-ui/icons/Delete";
import Edit from "@material-ui/icons/Edit";
import Add from "@material-ui/icons/Add";
import Remove from '@material-ui/icons/Remove';
import SaveAlt from '@material-ui/icons/SaveAlt';
import FolderIcon from '@material-ui/icons/Folder';
const tableIcons = {
	Search: forwardRef((props, ref) => <Search {...props} ref={ref}/>),
	FirstPage: forwardRef((props, ref) => <FirstPage {...props} ref={ref}/>),
	LastPage: forwardRef((props, ref) => <LastPage {...props} ref={ref}/>),
	NextPage: forwardRef((props, ref) => <ChevronRight {...props} ref={ref}/>),
	PreviousPage: forwardRef((props, ref) => <ChevronLeft {...props} ref={ref}/>),
	Clear: forwardRef((props, ref) => <Clear {...props} ref={ref}/>),
	ResetSearch: forwardRef((props, ref) => <Clear {...props} ref={ref}/>),
	SortArrow: forwardRef((props, ref) => <ArrowDownward {...props} ref={ref}/>),
	Info: forwardRef((props, ref) => <Info {...props} ref={ref}/>),
	DetailPanel: forwardRef((props, ref) => <Info {...props} ref={ref}/>),
	Check: forwardRef((props, ref) => <Check {...props} ref={ref}/>),
	Delete: forwardRef((props, ref) => <Delete {...props} ref={ref}/>),
	Edit: forwardRef((props, ref) => <Edit {...props} ref={ref}/>),
	Add: forwardRef((props, ref) => <Add {...props} ref={ref}/>),
	ThirdStateCheck: forwardRef((props, ref) => <Remove {...props} ref={ref}/>),
	Export: forwardRef((props, ref) => <SaveAlt {...props} ref={ref}/>),
	Open: forwardRef((props, ref) => <FolderIcon {...props} ref={ref}/>)
};

const validators = {
	number: (value) => {
		if (value === undefined || !validator.isFloat(value) || !validator.isInt(value)) {
			return {isValid: false};
		}
		return {isValid: true};
	},
	bool: (value) => {
		if (value === undefined || (value !== true && value !== false)) {
			return {isValid: false};
		}
		return {isValid: true};
	},
	is_true: (value) => {
		return {isValid: booleanize(value)};
	},
	string: (value) => {
		if (value === undefined || validator.isEmpty(value) || !validator.isAscii(value)) {
			return {isValid: false};
		}
		return {isValid: true};
	},
	time: (value) => {
		if (value === undefined || !validator.isDate(value)) {
			return {isValid: false};
		}
		return true;
	},
	uuid: (value) => {
		if (value === undefined || !validator.isUUID(value, 4)) {
			return {isValid: false};
		}
		return {isValid: true};
	},
	none: {isValid: true}
}

// Options for notistack - Event notification/alerting library - Success/fail on table operations
const notistack_options = (variant) => {
	return {
		variant: variant,
		autoHideDuration: 3000
	}
}

const booleanize = (value) => {
	if (value === undefined){
		return false;
	} else if (typeof(value) == 'string'){
		value = value.toLowerCase();
	}
	switch(value){
		case true:
		case "true":
		case 1:
		case "1":
		case "on":
		case "yes":
			return true;
		default: 
			return false;
	}
}

const cell_format = { 
	wordBreak: 'break-all', 
	padding: '0 3px'
}

const left_table_header_styles = {
	width: '100%',
	textAlign: 'left',
	verticalAlign: 'bottom',
	paddingBottom: '5px',
	whiteSpace: 'pre-wrap'
}

const center_table_header_styles = {
	width: '100%',
	textAlign: 'center',
	verticalAlign: 'bottom',
	paddingBottom: '5px'
}

const azure_ad_authorities = {
	AZURE_PUBLIC_CLOUD: "Azure Public Cloud",
	AZURE_CHINA: "Azure China",
	AZURE_GERMANY: "Azure Germany",
	AZURE_GOVERNMENT: "Azure US Government"
}

const azure_blob_types = {
	blob: "Blob",
	datalake: "Data Lake"
}

const table_options = {
	grouping: false,
	search: false,
	exportButton: false,
	toolbar: true,
	paging: false,
	draggable: false,
	headerStyle: {},
	rowStyle: { 
		padding: '0',
		fontSize: '12px', 
		wordBreak: 'break-all' },
	headerStyle: left_table_header_styles,
	actionsColumnIndex: -1,
	actionsCellStyle: {
		padding: '0',
		/*display:"flex", */
		justifyContent: "center"}
};

const config_descriptions = {
	['ep_hec']: 		'HTTP Event Collector',
	['ep_aws_s3']: 		'S3-Compatible',
	['ep_azure_blob']: 'Azure Blob',
	['ep_box']: 		'Box.com',
	['ep_sftp']: 		'SFTP',
	['ep_smb']: 		'SMB',
}

const LoadingOverlay = (props) => { 
	return (
		<div id="loading_overlay"
			style={{
				position: "fixed",
				left: 0,
				zIndex: 9999,
				width: "100%",
				height: "100%",
				display: "block",
				background: "rgba(0,0,0,0.6)"}}
		> 
			<div style={{
				height: "100%",
				display: "flex",
				justifyContent: "center",
				alignItems: "center"
			}}>
				<span className="spinner" ></span>
			</div>
		</div>
	)
}

async function getAllUrls(urls) {
	try {
		var data = await Promise.all(
			urls.map(
				url =>
					fetch(url).then(
						(response) => response.json()
					)));
		return (data)

	} catch (error) {
		console.log(error)
		throw (error)
	}
}

class App extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			show_file_browser: false,		
			file_list: [],					// begin chonky
			folder_chain: [],				// 
			current_folder: '',				// 
			current_config_container: '',				// 
			current_config: '', 			// 
			current_config_alias: '',		// end chonky,
			loading: true,					// FadeIn control for chonky modal & config load wait
			['ep_general']: {},
			// table lists
			['ep_hec']: [], 
			['ep_aws']: [],
			['ep_box']: [],
			['ep_sftp']: [],
			['ep_smb']: [],
			passwords: [],
			roles: [],
			users: []
		}
		this.is_splunk_cloud = false;

		// Tabs
		this.EPTabContent = this.EPTabContent.bind(this);

		this.get_config_stanza('ep_general', "settings").then((d) => {
			console.log("Setting state from constructor");
			this.setState({['ep_general']: d});
		})
		
		// Check to see if we are running Splunk Cloud
		this.get_server_info().then((server_info) => {
			this.is_splunk_cloud = (server_info["instance_type"] == 'cloud');
			let instance_type = server_info["instance_type"] != null ? server_info["instance_type"] : 'Splunk Enterprise'
			console.log(`Instance type: ${instance_type}`);
		});

		this.refresh_tables();
	}

	columns = {
		['ep_hec']: [ 
			{ title: "Stanza", field: "stanza", hidden: true },
			// actions = 10%
			{ title: "Default", field: "default", type: "boolean", width: "5%", headerStyle: center_table_header_styles },
			{ title: "Name/Alias", field: "alias", width: "20%", 
				validate: rowData => validators.string(rowData.alias).isValid }, 
			{ title: "Hostname", field: "host", width: "25%", 
				validate: rowData => validators.string(rowData.host).isValid },
			{ title: "TCP Port", field: "port", width: "10%", 
				validate: rowData => (validators.number(rowData.port).isValid || rowData.port == null || rowData.port == "") },
			{ title: "HEC Token", field: "token", width: "20%", 
				validate: rowData => validators.uuid(rowData.token).isValid },
			{ title: "SSL", field: "ssl", type: "boolean", width: "5%", initialEditValue: 1, headerStyle: center_table_header_styles,
				// Force SSL to true for Splunk Cloud
				validate: rowData => (this.is_splunk_cloud ? validators.is_true(rowData.ssl) : validators.bool(rowData.ssl)) },
			{ title: "Verify SSL", field: "ssl_verify", type: "boolean", width: "5%", initialEditValue: 1, headerStyle: center_table_header_styles,
				// Force Verify SSL to true for Splunk Cloud
				validate: rowData => (this.is_splunk_cloud ? validators.is_true(rowData.ssl_verify) : validators.bool(rowData.ssl_verify)) },
		],
		['ep_aws_s3']: [
			{ title: "Stanza", field: "stanza", hidden: true },
			// actions = 10%
			{ title: "Default", field: "default", type: "boolean", width: "5%", headerStyle: center_table_header_styles },
			{ title: "Name/Alias", field: "alias", width: "12%", 
				validate: rowData => validators.string(rowData.alias) }, 
			{ title: "Access Key", field: "credential", width: "15%", 
				editComponent: props => 
				<FormControl>
				<Select 
					id="credential" 
					name="credential"
					style={{ width: "150px" }}
					defaultValue={props.value ?? '[EC2 ARN]'}
					onChange={e => {props.onChange(e.target.value)}}
					>
					<MenuItem value="">None</MenuItem>
					<MenuItem value='[EC2 ARN]'>Use EC2 ARN</MenuItem>
					{ this.state.passwords.map(credential =>
						<MenuItem value={credential.stanza}>{credential.stanza}</MenuItem>
					)}
				</Select> 
				</FormControl>
			},
			{ title: "Region", field: "region", width: "10%", 
				validate: rowData => validators.string(rowData.region).isValid }, 
			{ title: "Endpoint URL\n(Blank for AWS S3)", field: "endpoint_url", width: "12%" },
			{ title: "Default Bucket ID", field: "default_s3_bucket", width: "12%" },
			{ title: "Compress Output", field: "compress", type: "boolean", width: "5%", headerStyle: center_table_header_styles }
		],
		['ep_azure_blob']: [
			{ title: "Stanza", field: "stanza", hidden: true },
			// actions = 10%
			{ title: "Default", field: "default", type: "boolean", width: "5%", headerStyle: center_table_header_styles },
			{ title: "Name/Alias", field: "alias", width: "15%", 
				validate: rowData => validators.string(rowData.alias) }, 
			{ title: "Storage Account Name", field: "storage_account", width: "25%", 
			validate: rowData => validators.string(rowData.storage_account) }, 
			{ title: "Account Key (Credential)", field: "credential", width: "15%", 
				editComponent: props => 
				<FormControl>
				<Select 
					id="credential" 
					name="credential"
					style={{ width: "200px" }}
					defaultValue={props.value === undefined ? '' : props.value}
					onChange={e => {props.onChange(e.target.value)}}
					>
					<MenuItem value="">None</MenuItem>
					{ this.state.passwords.map(credential =>
						<MenuItem value={credential.stanza}>{credential.stanza}</MenuItem>
					)}
				</Select> 
				</FormControl>
			},
			{ title: "Azure AD", field: "azure_ad", type: "boolean", width: "5%", headerStyle: center_table_header_styles },
			{ title: "Azure AD Authority", field: "azure_ad_authority", width: "15%", 
				render: rowData => <span>{ azure_ad_authorities[rowData.azure_ad_authority] }</span>,
				editComponent: props =>
					<FormControl>
					<Select 
						id="azure_ad_authority" 
						name="azure_ad_authority"
						disabled={ !props.rowData.azure_ad }
						style={{ width: "80px" }}
						defaultValue={props.value === undefined ? '' : props.value}
						onChange={e => {props.onChange(e.target.value)}}
						>
						<MenuItem key='' value=''>N/A</MenuItem>
						{ Object.entries(azure_ad_authorities)
						  .map( ([key, value]) => <MenuItem value={key}>{value}</MenuItem>
						)}
					</Select> 
					</FormControl>
			},
			{ title: "Type", field: "type", width: "10%", 
				render: rowData => <span>{ azure_blob_types[rowData.type] }</span>,
				editComponent: props => 
					<FormControl>
					<Select 
						id="type" 
						name="type"
						style={{ width: "80px" }}
						defaultValue={props.value === undefined ? '' : props.value}
						onChange={e => {props.onChange(e.target.value)}}
						>
						{ Object.entries(azure_blob_types)
						.map( ([key, value]) => <MenuItem value={key}>{value}</MenuItem>
						)}
					</Select> 
					</FormControl>
			},
			{ title: "Default Container", field: "default_container", width: "20%" }, 
			{ title: "Compress Output", field: "compress", type: "boolean", width: "5%", headerStyle: center_table_header_styles }
		],
		['ep_box']: [
			{ title: "Stanza", field: "stanza", hidden: true },
			// actions = 10%
			{ title: "Default", field: "default", type: "boolean", width: "5%", headerStyle: center_table_header_styles },
			{ title: "Name/Alias", field: "alias", width: "14%", 
				validate: rowData => validators.string(rowData.alias).isValid }, 
			{ title: "Enterprise ID", field: "enterprise_id", width: "10%", 
				validate: rowData => validators.string(rowData.enterprise_id).isValid },
			{ title: "Client Credential", field: "client_credential", width: "15%", 
				editComponent: props => 
				<FormControl>
				<Select 
					id="client_credential" 
					name="client_credential"
					style={{ width: "150px" }}
					defaultValue={props.value}
					onChange={e => {props.onChange(e.target.value)}}
					>
					<MenuItem value="">None</MenuItem>
					{ this.state.passwords.map(credential =>
						<MenuItem value={credential.stanza}>{credential.stanza}</MenuItem>
					)}
				</Select> 
				</FormControl>
			},
			{ title: "Public Key ID", field: "public_key_id", width: "9%", 
				validate: rowData => validators.string(rowData.public_key_id) },
			{ title: "Private Key", field: "private_key", width: "36%", cellStyle: { wordBreak: 'keep-all'}, 
				validate: rowData => validators.string(rowData.private_key).isValid,
				render: rowData => <span className="password_field">{((rowData.private_key === undefined || rowData.private_key == '') ? '' : '[configured]')}</span>,
				editComponent: ({ value, onChange }) => (
					<TextField
						error={ (value == null || !validators.string(value).isValid) }
						onChange={e => {onChange(e.target.value)}}
						value={value}
						placeholder="Private Key"
						multiline
						minRows={1}
						maxRax={4}
						/>) },
			{ title: "Passphrase Credential", field: "passphrase_credential", width: "15%", 
				editComponent: props => 
				<FormControl>
				<Select 
					id="passphrase_credential" 
					name="passphrase_credential"
					style={{ width: "150px" }}
					defaultValue={props.value}
					onChange={e => {props.onChange(e.target.value)}}
					>
					<MenuItem value="">None</MenuItem>
					{ this.state.passwords.map(credential =>
						<MenuItem value={credential.stanza}>{credential.stanza}</MenuItem>
					)}
				</Select> 
				</FormControl>
			},
			{ title: "Default Folder", field: "default_folder", width: "20%" }, 
			{ title: "Compress Output", field: "compress", type: "boolean", width: "5%", headerStyle: center_table_header_styles }
		],
		['ep_sftp']: [
			{ title: "Stanza", field: "stanza", hidden: true },
			// actions = 10%
			{ title: "Default", field: "default", type: "boolean", width: "5%", headerStyle: center_table_header_styles },
			{ title: "Name/Alias", field: "alias", width: "14%", 
				validate: rowData => validators.string(rowData.alias).isValid }, 
			{ title: "Hostname", field: "host", width: "35%", 
				validate: rowData => validators.string(rowData.host).isValid },
			{ title: "TCP Port", field: "port", width: "10%",
				validate: rowData => (validators.number(rowData.port).isValid || rowData.port == null || rowData.port == "") },
			{ title: "User Credential", field: "credential", width: "15%", 
				editComponent: props => 
				<FormControl>
				<Select 
					id="credential" 
					name="credential"
					style={{ width: "150px" }}
					defaultValue={props.value}
					onChange={e => {props.onChange(e.target.value)}}
					>
					<MenuItem value="">None</MenuItem>
					{ this.state.passwords.map(credential =>
						<MenuItem value={credential.stanza}>{credential.stanza}</MenuItem>
					)}
				</Select> 
				</FormControl>
			},
			{ title: "Private Key", field: "private_key", width: "36%", cellStyle: { wordBreak: 'keep-all'}, 
				render: rowData => <span className="password_field">{((rowData.private_key === undefined || rowData.private_key == '') ? '' : '[configured]')}</span>,
				validate: rowData => 
					(this.is_splunk_cloud && rowData.private_key !== undefined && rowData.private_key != '' && (rowData.passphrase_credential == '' || rowData.passphrase_credential === undefined))
					? { isValid: false, helperText: "Cannot be unencrypted in Splunk Cloud. Select a decryption credential." }
					: { isValid: true, helperText: "" },
				editComponent: props => (
					<TextField
						error={ validators.string(props.value).isValid && (props.rowData.passphrase_credential == null || props.rowData.passphrase_credential == '') && this.is_splunk_cloud }
						helperText={props.error && props.helperText}
						onChange={e => {props.onChange(e.target.value)}}
						value={props.value}
						placeholder="Private Key"
						multiline
						minRows={1}
						maxRax={4}
					/>) },
			{ title: "Passphrase Credential", field: "passphrase_credential", width: "15%", 
				// Force using a passphrase / encrypting the private key in Splunk Cloud
				editComponent: props => 
				<FormControl>
				<Select 
					id="passphrase_credential" 
					name="passphrase_credential"
					style={{ width: "150px" }}
					defaultValue={props.value}
					onChange={e => {props.onChange(e.target.value)}}
					>
					<MenuItem value="">None</MenuItem>
					{ this.state.passwords.map(credential =>
						<MenuItem value={credential.stanza}>{credential.stanza}</MenuItem>
					)}
				</Select> 
				</FormControl>
			},
			{ title: "Default Folder", field: "default_folder", width: "20%" }, 
			{ title: "Compress Output", field: "compress", type: "boolean", width: "5%", headerStyle: center_table_header_styles }
		],
		['ep_smb']: [
			{ title: "Stanza", field: "stanza", hidden: true },
			// actions = 10%
			{ title: "Default", field: "default", type: "boolean", width: "5%", headerStyle: center_table_header_styles },
			{ title: "Name/Alias", field: "alias", width: "14%", 
				validate: rowData => validators.string(rowData.alias) }, 
			{ title: "Hostname", field: "host", width: "35%", 
				validate: rowData => validators.string(rowData.host) },
			{ title: "Credential", field: "credential", width: "15%", 
				editComponent: props => 
				<FormControl>
				<Select 
					id="credential" 
					name="credential"
					style={{ width: "150px" }}
					defaultValue={props.value}
					onChange={e => {props.onChange(e.target.value)}}
					>
					<MenuItem value="">None</MenuItem>
					{ this.state.passwords.map(credential =>
						<MenuItem value={credential.stanza}>{credential.stanza}</MenuItem>
					)}
				</Select> 
				</FormControl>
			},
			{ title: "Share Name", field: "share_name", width: "15%", 
				validate: rowData => validators.string(rowData.share_name).isValid },
			{ title: "Default Folder", field: "default_folder", width: "20%" }, 
			{ title: "Compress Output", field: "compress", type: "boolean", width: "5%", headerStyle: center_table_header_styles }
		],
		passwords: [
			// actions = 10%
			{ title: "Username", field: "username", width: "15%", 
				validate: rowData => validators.string(rowData.username).isValid,
				editComponent: props => ( 
					props.rowData.id && <span>{props.rowData.username}</span> || <TextField
					value={props.value}
					inputProps={{"placeholder": "Username"}}
					onChange={e => {props.onChange(e.target.value)}}
				/>) 
			},
			{ title: "Password", field: "password", width: "15%", 
				validate: rowData => validators.string(rowData.password).isValid,
				render: rowData => <span className="password_field">{((rowData.password === undefined || rowData.password == '') ? '' : '*'.repeat(8))}</span>,
				editComponent: props => (
					<TextField
						error={ (props.value == null || !validators.string(props.value).isValid) }
						type="password"
						value={props.value}
						inputProps={{"placeholder": "Password"}}
						onChange={e => {props.onChange(e.target.value)}}
					/>) 
			},
			{ title: "Realm/Domain", field: "realm", width: "15%",
				editComponent: props => ( 
					props.rowData.id && <span>{props.rowData.realm}</span> || <TextField
					value={props.value}
					inputProps={{"placeholder": "Realm"}}
					onChange={e => {props.onChange(e.target.value)}}
				/>) 
			},
			{ title: "Owner", field: "owner", width: "10%",
				editComponent: props => 
					<FormControl>
					<Select 
						id="owner" 
						name="owner"
						style={{ width: "150px" }}
						defaultValue={props.value ?? 'nobody'}
						//value={!props.value ? 'nobody' : props.value}
						onChange={e => props.onChange(e.target.value)}
						>
						<MenuItem key='nobody' value='nobody'>nobody</MenuItem>
						{this.state.users.map(user => (
							<MenuItem key={user.name} value={user.name}>{user.name}</MenuItem>
						))}
					</Select>
					</FormControl>
			},
			{ title: "Read", field: "read", width: "20%",
				render: rowData => <span>{rowData['read'].join(', ')}</span>,
				editComponent: props => 
					<FormControl>
					<Select 
						id="read" 
						name="read"
						style={{ width: "180px" }}
						defaultValue={(Array.isArray(props.value) && props.value) || props.value && [props.value] || ['*']}
						multiple
						onChange={e => {props.onChange(e.target.value)}}
						>
						<MenuItem key='*' value='*'>All</MenuItem>
						{ this.state.roles.map(role =>
							<MenuItem key={role.name} value={role.name}>{role.name}</MenuItem>
						  )}
					</Select>
					</FormControl>
			},
			{ title: "Write", field: "write", width: "20%", 
				render: rowData => <span>{rowData['write'].join(', ')}</span>,
				editComponent: props => 
					<FormControl>
					<Select 
						id="write" 
						name="write"
						style={{ width: "180px" }}
						defaultValue={(Array.isArray(props.value) && props.value) || props.value && [props.value] || ['*']}
						multiple
						onChange={e => {props.onChange(e.target.value)}}
						>
						<MenuItem key='*' value='*'>All</MenuItem>
						{ this.state.roles.map(role =>
							<MenuItem key={role.name} value={role.name}>{role.name}</MenuItem>
						  )}
					</Select>
					</FormControl>
			}
		]
	};
	
	// Download the data and push it into the corresponding state entry
	refresh_tables = () => {
		this.setState({loading: true});
		let tables = Object.keys(this.columns);
		console.log("Refreshing tables");
		//Promise.all(tables.map( async (table) => {
		Promise.all(tables.map( (table) => {
			//console.log(`Refreshing ${table}`)
			let d = this.refresh_table(table, false);
			return d
		}))
		.then((table_data) => {
			// Convert array of single-item dicts to one dict
			// Passwords a 3-item dict
			let new_state = {loading: false}
			table_data.map( (table_dict) => {
				if (table_dict != null) {
					for (const [key, value] of Object.entries(table_dict)) {
						new_state[key] = value;
					}
				}
			})
			//console.log(JSON.stringify(new_state));
			this.setState(new_state);
			console.log("Refreshing tables complete");
		});
	}

	// Download data for an individual table and update the state
	refresh_table = (table, setstate=true) => {
		return new Promise((resolve, reject) => {
			this.get_config(table).then((d) => {
				let table_data;
				if (table == 'passwords') {
					table_data = d;
				} else {
					// Convert the REST response data into a usable row format
					table_data = {[table]: this.rest_to_rows(table, d)};
				}
				if (setstate) {
					this.setState(table_data);
					console.log(`State set for ${table}`)
				}
				resolve(table_data)
			})
		})
	}

	// Convert an object to an HTTP query string (for Splunk configuration POST requests)
	dict_to_querystring = (d) => {
		let query_list = [];
		let item_list = Object.entries(d);
		for ( var item of item_list ) {
			let name = item[0];
			let val = encodeURIComponent(item[1]);
			query_list.push(name + '=' + val);		
		};
		//console.log("Query list: " + query_list.toString());
		// Join list with & for query string
		return query_list.join('&');
	}

	// Convert REST API responses to a list of objects that translate to table rows
	rest_to_rows = (config_file, d) => {
		let rows = [];
		// Get the names of fields from the columns definition
		let valid_fields = this.list_table_fields(this.columns[config_file])
		//console.log(`Valid fields for ${config_file}: ${JSON.stringify(valid_fields)}`);
		for ( var rest_entry of d ) {
			let row = rest_entry.content;
			row.stanza = rest_entry.name;
			for (var key of Object.keys(row)) {
				// Sanitize the output from the API to only include our defined columns
				if (!valid_fields.includes(key)) {
					delete row[key];
				} else {
					// Find boolean fields and convert the values from strings
					for ( var field of this.columns[config_file] ){
						if ( field.field == key && field.type == "boolean" ) {
							row[key] = booleanize(row[key]);
						}
					}
				}
			}
			rows.push(row);
		}
		return rows;
	}

	list_table_fields = (l) => {
		// l = List of dicts passed
		let fields = [];
		
		for (var d of l) {
			fields.push(d.field);
		}
		return fields;
	}

	// If "Default" attribute is set, unset it for all other entries in the configuration
	unset_default_entry = (config_file, new_data) => {
		return new Promise((resolve, reject) => {
			// Only do something if the new/updated entry is set to default=true
			if ( (new_data.default === undefined) ? false : new_data.default ) {
				
				console.log("Finding default entry")
				let old_default_entry = this.state[config_file].find(entry => entry.default == true);

				// Make sure a default exists in the first place
				if (old_default_entry !== undefined ) {
					if ( old_default_entry.stanza != new_data.stanza && old_default_entry.default ) {
						let updated_old_entry = {...old_default_entry};
						//console.log("old_default_entry: " + JSON.stringify(old_default_entry));
						//console.log("updated_old_entry: " + JSON.stringify(updated_old_entry));
						delete updated_old_entry.tableData;
						updated_old_entry.default = false;
						this.update_row_data(config_file, updated_old_entry, old_default_entry).then(() => resolve());
					}
				}
				//}
			}
			resolve();
		})
	}

	get_missing_form_data = (config_file, new_data) => {
		// Check for missing items, e.g. blank values
		let expected_fields = [];
		this.columns[config_file].map(c => {
			expected_fields.push(c.field);
		});
		console.log(`Fields enumerated for ${config_file}: ${expected_fields.join(', ')}`)
		let missing_fields = [];
		expected_fields.map(f => {
			if (!(f in new_data)) {
				missing_fields.push(f);
			}
		})
		if (missing_fields.length > 0) {
			console.log(`Missing fields for ${config_file}: ${missing_fields.join(', ')}`)
			// Get the missing field values from the table in case they were set
			missing_fields.map(mf => {
				try {
					// dropdown value DOM path
					let v = $(`#${mf} + input`).val();
					if (v != null) {
						new_data[mf] = v;
						console.log(`Found missing field ${mf} = ${v}`);
					}
				} catch (error) {
					console.error(error);
				}
			});
		}
		
		return new_data;
	}

	get_server_info = () => {
		return new Promise((resolve, reject) => {
			let endpoint = `/servicesNS/-/-/server/info/server-info`;
			this.get_endpoint(endpoint).then((d) => {
				resolve(d[0]["content"]);
			})
		});
	}

	get_config_stanza = (config_file, stanza) => {
		return new Promise((resolve, reject) => {
			this.props.splunk.get(`${app}/${config_file}/${stanza}`).then((d) => {
				let clear = JSON.parse(d);
				//resolve(clear);
				resolve(clear["entry"][0]["content"]);
			})
		});
	}

	get_config = (config_file) => {
		return new Promise((resolve, reject) => {
			if (config_file == 'passwords') {
				let password_endpoint = `/servicesNS/-/${app}/storage/passwords`;
				this.get_endpoint(password_endpoint).then((passwords) => {
					let role_endpoint = `/servicesNS/-/-/authorization/roles`;
					this.get_endpoint(role_endpoint).then((roles) => {
						let user_endpoint = `/servicesNS/-/-/authentication/users`;
						this.get_endpoint(user_endpoint).then((users) => {
							let pw_list = [];
							for (let password of passwords) {
								if (password.acl.app == app) {
									// Build the custom password object to match the row fields in the UI
									let c = {}
									c.stanza = password.name;
									c.id = password.id;
									c.username = password.content.username;
									c.password = password.content.encr_password;
									c.realm = password.content.realm;
									c.sharing = password.acl.sharing;
									c['owner'] = password.acl.owner;
									c['read'] = password.acl.perms.read;
									c['write'] = password.acl.perms.write;
									c.links = password.links;
									c.api_entry = password;
									pw_list.push(c);
								}
							}
							let password_state = {
								'passwords': pw_list,
								'users': users,
								'roles': roles
							}
							resolve(password_state);
						})
					})
				})

			} else {
				let endpoint = `/servicesNS/-/${app}/${app}/${config_file}`;
				resolve(this.get_endpoint(endpoint));
			}
		});
	}
	
	get_endpoint = (endpoint) => {
		return new Promise((resolve, reject) => {
			let params = {
				"output_mode": "json",
				"count": "0"
			};
			this.props.splunk.request(endpoint,
				"GET",
				params,
				null,
				null,
				{"Content-Type": "application/x-www-form-urlencoded"},
				(err, response) => {
					if (err == null) {
						resolve(response.data.entry);
					} else {
						this.props.enqueueSnackbar(`Error querying ${endpoint}:\n ${err.status}: ${err.error}`, notistack_options('error'));
						reject(String(err.status) + ': ' + err.error);
					}
				}
			)
		});
	}

	put_config_item = (config_file, items) => {
		//console.log("Config file = " + config_file);
		return new Promise((resolve, reject) => {
			let items_copy = { ...items };
			if (config_file == 'passwords') {
				//console.log('items = ' + JSON.stringify(items_copy));
				var rest_endpoint = `/servicesNS/-/${app}/storage/passwords`
				// Rename property username to name
				items_copy.name = items_copy.username;
				delete items_copy.username;
				delete items_copy.owner;
				delete items_copy.stanza;
				delete items_copy.read;
				delete items_copy.write;
				//console.log(items_copy);
			} else if ( 'stanza' in items_copy ) {
				var rest_endpoint = `${app}/${config_file}/${items_copy.stanza}`;
			} else {
				var rest_endpoint = `${app}/${config_file}`;
			};

			this.props.splunk.request(rest_endpoint,
				"POST",
				{"output_mode": "json"},
				null,
				this.dict_to_querystring(items_copy),
				{"Content-Type": "application/x-www-form-urlencoded"},
				(err, response) => {
					if (err == null) {
						this.props.enqueueSnackbar('Record created successfully', notistack_options('success'));
						resolve(response.data);
					} else {
						this.props.enqueueSnackbar(`Error creating record:\n ${err.status}: ${err.error}`, notistack_options('error'));
						reject(String(err.status) + ': ' + err.error);
					}
				}
			);
		});
	}
	
	// Set the state data when adding a configuration item using the table view
	add_row_data = async (config_file, new_data) => {
		console.log("New data = " + JSON.stringify(new_data));
		return new Promise((resolve, reject) => {
			if (config_file != 'passwords') {
				new_data.stanza = uuid.v4();
			}
			const dataNew = [...this.state[config_file]];
			// If "default" is set for this new record, unset it for any other records that might have it
			this.unset_default_entry(config_file, new_data).then(() => {
				new_data = this.get_missing_form_data(config_file, new_data);
				this.put_config_item(config_file, new_data).then(d => {
					return new Promise((resolve, reject) => {
						//console.log('[create] new_data = ' + JSON.stringify(new_data));
						//console.log('d = ' + JSON.stringify(d));
						if (config_file == 'passwords') {
	
							let remote_credential_entry = d.entry[0];
							let c = {}
							// Build the custom password object to match the row fields in the UI
							c.stanza = remote_credential_entry.name;
							c.id = remote_credential_entry.id;
							c.username = remote_credential_entry.content.username;
							c.password = remote_credential_entry.content.encr_password;
							c.realm = remote_credential_entry.content.realm;
							c.sharing = remote_credential_entry.acl.sharing;
							c.app = remote_credential_entry.acl.app;
							c.links = remote_credential_entry.links;
							c.api_entry = remote_credential_entry;
							// Material-UI refuses to pass these values into newData
							c.owner = new_data.owner;
							c.read = Array.isArray(new_data.read) ? new_data.read : new_data.read.split(',');
							c.write = Array.isArray(new_data.write) ? new_data.write : new_data.write.split(',');
	
							// Update the ACL to what was supplied
							// Check to see if it is different from default
							if (c.owner != remote_credential_entry.acl.owner || 
								JSON.stringify(c.read) !== JSON.stringify(remote_credential_entry.acl.perms.read) || 
								JSON.stringify(c.write) !== JSON.stringify(remote_credential_entry.acl.perms.write)) {
								//(username, stanza, owner, read, write, sharing)
								this.update_credential_acl(
								   c.stanza,
								   c.realm,
								   c.owner,
								   c.read,
								   c.write,
								   'global'
								  ).then(r => {
									resolve(c);
								});
							} else {
								resolve(c);
							}
						} else {
							resolve(new_data);
						}
					}).then(d => {
						dataNew.push(d);
						console.log("Setting state from add_row_data");
						this.setState({[config_file]: dataNew});
						//this.refresh_table(config_file);
						resolve();
					});
				});
			})
		});
	}

	// Update the configuration file using the EAI REST endpoint
	update_config_item = (config_file, item) => {
		//console.log("Item = " + JSON.stringify(item));
		return new Promise((resolve, reject) => {
			if (item.hasOwnProperty('tableData')) {
				delete item.tableData;
			}
			
			if (config_file == 'passwords') {
				var rest_endpoint = `/servicesNS/-/${app}/storage/passwords/${item.stanza.replace(new RegExp("(:|%3A)+$", "i"), "")}`;
				// See if the ACL needs updating
				let oldcred = this.state.passwords.find(credential => credential.stanza == item.stanza);
				let newacl = {
					// Probably shouldn't be doing this ::shrug::
					owner: $('#owner + input').val(),
					read: $('#read + input').val().split(','),
					write: $('#write + input').val().split(',')
				}
				if (oldcred.owner !== newacl.owner || 
					JSON.stringify(oldcred.read) !== JSON.stringify(newacl.read) || 
					JSON.stringify(oldcred.write) !== JSON.stringify(newacl.write)) {
					
					// Update the ACL
					console.log("Updating ACL for " + JSON.stringify(oldcred));
					this.update_credential_acl(
						item.stanza,
						item.realm,
						newacl.owner,
						newacl.read,
						newacl.write,
						'global'
					);
				}
				let item_copy = { password: item.password };
				// Move the pointer to our new object
				item = item_copy;
			} else {
				var rest_endpoint = `${app}/${config_file}/${item.stanza}`
			}

			this.props.splunk.request(rest_endpoint,
				"POST",
				{"output_mode": "json"},
				null,
				this.dict_to_querystring(item),
				{"Content-Type": "application/x-www-form-urlencoded"},
				(err, response) => {
					if (err == null) {
						this.props.enqueueSnackbar('Update successful', notistack_options('success'));
						resolve(response.data);
					} else {
						this.props.enqueueSnackbar(`Error updating record:\n ${err.status}: ${err.error}`, notistack_options('error'));
						reject(String(err.status) + ': ' + err.error);
					}
				}
			);
		});
	}

	// Update the UI and state
	update_row_data = (config_file, updated_entry, original_entry) => {
		return new Promise((resolve, reject) => {
			// Account for values set to blank, which are not submitted automatically
			updated_entry = this.get_missing_form_data(config_file, updated_entry);

			// If "default" is set for this updated record, unset it for any other records that might have it
			this.unset_default_entry(config_file, updated_entry).then(() => {
				this.update_config_item(config_file, updated_entry).then(() => {
					//this.refresh_table(config_file);
					console.log("Setting state from update_row_data");
					const dataUpdate = [...this.state[config_file]];
					const index = original_entry.tableData.id;
					dataUpdate[index] = updated_entry;
					this.setState({[config_file]: dataUpdate});
					resolve();
				})
			});
		})
	}

	delete_config_item = (config_file, stanza) => {
		return new Promise((resolve, reject) => {
			
			if (config_file == 'passwords') {
				var rest_endpoint = `/servicesNS/-/${app}/storage/passwords/${stanza.replace(new RegExp(":+$"), "")}`
			} else {
				var rest_endpoint = `${app}/${config_file}/${stanza}`
			}

			this.props.splunk.request(rest_endpoint,
				"DELETE",
				{"output_mode": "json"},
				null,
				null,
				{"Content-Type": "application/x-www-form-urlencoded"}, 
				(err, response) => {
					if (err == null) {
						this.props.enqueueSnackbar('Record deleted successfully', notistack_options('success'));
						resolve(response.data);
					} else {
						this.props.enqueueSnackbar(`Error deleting record:\n ${err.status}: ${err.error}`, notistack_options('error'));
						reject(String(err.status) + ': ' + err.error);
					}
				}
			);
		});
	}

	delete_row_data = (config_file, oldData) => {
		return new Promise((resolve, reject) => {
			const dataDelete = [...this.state[config_file]];
			const index = oldData.tableData.id;
			dataDelete.splice(index, 1);
			this.delete_config_item(config_file, oldData.stanza).then(() => {
				console.log("Setting state from delete_row_data");
				this.setState({[config_file]: dataDelete});
				//this.refresh_table(config_file);
				resolve();
			});
		})
	}

	update_credential_acl = (username, realm, owner, read, write, sharing) => {
		return new Promise((resolve, reject) => {
			// read and write must be arrays
			let acl = {
				'perms.read': read,
				'perms.write': write,
				'sharing': sharing,
				'owner': owner
			}
			//console.log("New ACL = " + JSON.stringify(acl));
			let rest_endpoint = `configs/conf-passwords/credential%3A${username}/acl`
			this.props.splunk.request(rest_endpoint,
				"POST",
				{"output_mode": "json"},
				null,
				this.dict_to_querystring(acl),
				{"Content-Type": "application/x-www-form-urlencoded"},
				(err, response) => {
					if (err == null) {
						this.props.enqueueSnackbar('ACL update successful', notistack_options('success'));
						resolve(response.data);
					} else {
						this.props.enqueueSnackbar(`Error updating ACL:\n ${err.status}: ${err.error}`, notistack_options('error'));
						this.setState({loading: false})
						reject(String(err.status) + ': ' + err.error);
					}
				}
			);
		});
	}

	handleFileAction = (data) => {
		if (!data.payload.targetFile || !data.payload.targetFile.isDir) return;
		const newPrefix = `${data.payload.targetFile.id.replace(/\/*$/, '')}/`;
		this.show_folder_contents(this.state.current_config, this.state.current_config_alias, this.state.current_config_container, newPrefix)
	}

	// Set the state data when adding a configuration item using the table view
	show_folder_contents = (config_file, alias, container_name, folder) => {
		return new Promise((resolve, reject) => {
			// Showing folder data 
			let old_chain = [...this.state.folder_chain];
			let old_files = [...this.state.file_list];
			console.log("Old chain = " + JSON.stringify(old_chain));
			console.log("Old files = " + JSON.stringify(old_files));
			
			if (container_name === undefined || container_name === null || container_name.length == 0) {
				container_name = '/' 
			}
			
			this.setState({
				loading: true, 
				show_file_browser: true,
				current_config: config_file,
				current_config_alias: alias,
				current_config_container: container_name
			}, () => { // then
					let url=`${app}_dirlist`;
					let params = {
						"config": config_file,
						"alias": alias
					};
					
					// Start with the root - /
					let chain = [{
						id: '/',
						name: '/',
						isDir: true
					}];
					
					// If the query folder is blank, use the default container name in the chain
					// else, use what's in the folder setting only
					console.log('Container Name = ' + container_name)
					console.log('Folder = ' + folder)

					if (folder !== undefined && folder !== null && folder.length > 0) {
						params["folder"] = folder;
						let chain_path = '';
						if ( folder.match('^[0-9]+\/$')) {
							// Treat the folder like an ID
							chain = [];
							folder = folder.replace('/', '');
							console.log("Using folder argument as ID");
							// Is this ID already in the previously used chain? User opted to go backwards
							console.log("Old chain: " + JSON.stringify(old_chain));
							if ( old_chain.length > 0 ) {
								for ( let chain_entry of old_chain ) {
									chain.push(chain_entry);
									// Break if the just-added ID is the folder specified
									if ( chain_entry.id == folder ) {
										break;
									}
								}
								console.log("New chain 1: " + JSON.stringify(chain));
								if ( old_chain.length == chain.length ) {
									// We made it through our old chain without finding the selection
									// Must have been selected from the list shown
									// Get the object from the file list and append it to the folder chain
									for ( let old_file of old_files ) {
										console.log(folder + " / " + old_file.id);
										if (old_file.id == folder) {
											chain.push(old_file);
											break;
										}
									}
									console.log("New chain 2: " + JSON.stringify(chain));
								}
							}
						} else {
							console.log("Using folder argument as path");
							// Treat the folder argument like a path
							for (let f of folder.replace(/^\/+|\/+$/, "").split('/')) {
								if ( f.length > 0 ) {
									chain_path = chain_path + '/' + f;
									chain.push({
										id: chain_path,
										name: f,
										isDir: true
									})
									console.log("f = " + f);
								}
							}
						}
					} else if ( (folder === undefined || folder === null || folder.length == 0) && container_name != '/' ) {
						// Append the root file (folder) object - container_name = share, bucket, /, etc.
						chain.push({
							id: container_name, // '/',
							name: container_name,
							isDir: true
						});
					}
					//console.log("Setting chain to: " + JSON.stringify(chain));

					this.props.splunk.get(url, params)
					.then((d) => {
						let response = JSON.parse(d);
						let file_list;
						if ('entry' in response) {
							// Different format of response from Splunk. Get the data from within the object.
							if ('content' in response.entry[0] && Array.isArray(response.entry[0].content)) {
								file_list = JSON.parse(response.entry[0].content[0].payload);
							} else {
								// Error
								let response_data = {};
								// Convert the response to a dict
								for (let e of response.entry) {
									response_data[e.title] = e.content;
								}
								alert(`${response_data.status} Error retrieving the file listing: \n${response_data.error}`)
								this.setState({loading: false, show_file_browser: false});
								reject(response_data);
							}
						} else {
							file_list = response;
						}
						if (file_list != null) {
							if ('entry' in file_list) {
								// Different format of response from Splunk. Get the data from within the object.
								file_list = JSON.parse(file_list.entry[0].content[0].payload);
							}
							//console.log("File list = " + JSON.stringify(file_list));
							for (var f=0; f<file_list.length; f++) {
								if ( file_list[f].modDate !== undefined ) {
									if ( Number(file_list[f].modDate) !== 0 ) {
										// Firefox only works with the ISO string
										let printed_date = moment.unix(Number(file_list[f].modDate));
										file_list[f].modDate = printed_date.toISOString();
									} else {
										delete file_list[f].modDate
									}
								}
							}
							this.setState({"file_list": file_list}, () => {
								//console.log("Setting state from show_folder_contents (last)");
								this.setState({
									loading: false,
									folder_chain: chain});
							});
							//console.log(file_list);
							resolve(file_list);
						} else {
							alert(`${reason.status} Error retrieving the file listing: \n${reason.responseText}`)
							this.setState({loading: false, show_file_browser: false});
							reject(reason);
						}
					}, reason => {
						alert(`${reason.status} Error retrieving the file listing: \n${reason.responseText}`)
						this.setState({loading: false, show_file_browser: false});
						reject(reason);
					});
				}
			);
			resolve();
		});
	}

	componentDidMount = () => {

	};

	updateParentState = (prop) => {
		this.setState(Object.assign(this.state, prop));
	};


	EPTabContent = (props) => {
		const title = props.title || "";
		const heading = props.heading || "";
		const action_columns = props.action_columns || "2";
		const browsable = booleanize(props.browsable || "false");
		const config = props.config;

		return(
			<div className="form form-horizontal form-complex">
				<h1 className="ep">{title}</h1>
				{(props.children != null && props.children.length > 0) && (
					<div style={{width: '700px', paddingBottom: '15px'}}>
						<p>{props.children}</p>
					</div>
				)}

				<div className="panel-element-row">
					<MaterialTable
						components={{
							Container: props => (
								<div className={"actionicons-" + action_columns}>
									<div {...props} />
								</div>
							)
						}}
						title={
							<div className="form form-complex">
								<h2 className="ep">{heading}</h2>
							</div>
						}
						icons={tableIcons}
						columns={this.columns[config]}
						data={this.state[config]}
						editable={{
							onRowAdd: newData => this.add_row_data(config, newData),
							onRowUpdate: (newData, oldData) => this.update_row_data(config, newData, oldData),
							onRowDelete: oldData => this.delete_row_data(config, oldData)
						}}
						actions={ (browsable && [{
							  icon: tableIcons.Open,
							  tooltip: 'Browse',
							  onClick: (event,rowData) => { this.show_folder_contents(config, rowData.alias, rowData.share_name || rowData.default_s3_bucket || rowData.default_container, rowData.default_folder) }
						}])}
						options={table_options}
						className={"actionicons-" + action_columns}
					/>
				</div>
			</div>
		)
	}

	render() {
		let self = this;
		console.log("Rendering");
		return (
			<div>
				<Suspense fallback={<div>Loading...</div>}>
					{this.state.loading && <LoadingOverlay />}
				</Suspense>
				<Tabs id="tabs_list" className="nav nav-tabs" 
					defaultIndex={0} transition={false} >
					<TabList className="nav nav-tabs">
						<Tab className="nav-item"><a href="#" className="toggle-tab">General</a></Tab>
						<Tab className="nav-item"><a href="#" className="toggle-tab">Credentials</a></Tab>
						<Tab className="nav-item"><a href="#" className="toggle-tab">Splunk HEC</a></Tab>
						<Tab className="nav-item"><a href="#" className="toggle-tab">AWS S3-Compatible</a></Tab>
						<Tab className="nav-item"><a href="#" className="toggle-tab">Azure Blob</a></Tab>
						<Tab className="nav-item"><a href="#" className="toggle-tab">Box</a></Tab>
						<Tab className="nav-item"><a href="#" className="toggle-tab">SFTP</a></Tab>
						<Tab className="nav-item"><a href="#" className="toggle-tab">SMB</a></Tab>
					</TabList>
					<TabPanel className="tab-pane">
						<div className="form form-horizontal form-complex">
							<h1 className="ep">General Settings</h1>
							<FormControl id="general_form">
								<InputLabel id="logging_label">Logging Level</InputLabel>
								<Select labelId="logging_label" 
									id="log_level" 
									style={{ width: "150px" }}
									value={(this.state['ep_general'].log_level === undefined) ? "" : this.state['ep_general'].log_level}
									onChange={(event) => {
										this.update_config_item( 
											'ep_general', 
											{
												stanza: 'settings',
												log_level: event.target.value
											}
										)
										console.log("Setting state from General Settings tab");
										this.setState({['ep_general']: {log_level: event.target.value}});
									}}>
									<MenuItem value="DEBUG">Debug</MenuItem>
									<MenuItem value="INFO">Info</MenuItem>
									<MenuItem value="WARNING">Warning</MenuItem>
									<MenuItem value="ERROR">Error</MenuItem>
									<MenuItem value="CRITICAL">Critical</MenuItem>
								</Select>
							</FormControl>
						</div>
					</TabPanel>
					<TabPanel className="tab-pane">
						<div className="form form-horizontal form-complex">
							<h1 className="ep">Manage Credentials</h1>
							<div style={{width: '700px', paddingBottom: '15px'}}>
								<p>Use this panel to configure accounts, passwords, and secrets/passphrases to associate with your configured connections and private keys.  </p>
								<ul>
									<li>All credentials are stored securely in the Splunk secret store.</li>
									<li>Users must have the list_storage_passwords capability to read the credentials added to their roles. This will not give them access to read all passwords, only those you explicitly share.</li>
									<li>Access is secured using native Splunk roles as configured on this dashboard.</li>
									<li>Credential objects are exported to all apps so they are available to this app's search commands and alert actions. </li>
									<li>Only the password field is used for storing passphrases (e.g. for private keys), but the username must still be populated with an arbitrary value.</li>
								</ul>
							</div>
							<div className="panel-element-row">
								<MaterialTable
									components={{
										Container: props => (
											<div className={"actionicons-2"}>
												<div {...props} />
											</div>
										)
									}}
									title={
										<div className="form form-complex">
											<h2 className="ep">Account Management</h2>
										</div>
									}
									icons={tableIcons}
									columns={this.columns.passwords}
									data={this.state.passwords}
									editable={{
										onRowAdd: newData => this.add_row_data('passwords', newData),
										onRowUpdate: (newData, oldData) => this.update_row_data('passwords', newData, oldData),
										onRowDelete: oldData => this.delete_row_data('passwords', oldData)
									}}
									options={table_options}
									className={"actionicons-2"}
								/>
							</div>
						</div>
					</TabPanel>
					<TabPanel className="tab-pane">
						<this.EPTabContent 
							title={`Export to Splunk HTTP Event Collector (ephec)`}
							heading="Splunk HTTP Event Collector Connections" 
							action_columns="2" 
							config={'ep_hec'} >
								<p>Setup connections to Splunk HTTP Event Collector endpoints, including Cribl Stream.</p>
								<p>For Splunk Cloud, SSL will always be enabled and validation forced, per Splunk policy.</p>
						</this.EPTabContent>
					</TabPanel>
					<TabPanel className="tab-pane">
						<this.EPTabContent 
							title={`Export to AWS S3 (epawss3)`} 
							heading="S3-Compatible Connections" 
							action_columns="3"
							browsable="true"
							config={'ep_aws_s3'} >
							<p>Setup connections for AWS S3-compatible object storage repositories. These include, but are not limited to:</p>
							<ul>
								<li>S3</li>
								<li>Google Cloud Storage</li>
								<li>Oracle Cloud Infrastructure Object Storage</li>
								<li>MinIO</li>
								<li>Ceph</li>
							</ul>
							<p>For non-Amazon repositories, an endpoint URL must be specified and the region is generally "us-east-1" (unless the vendor documentation states otherwise).</p>
							<p>To avoid IAM key issuance and rotation, we recommend assigning an IAM role to your Splunk search head EC2 instance(s) and granting AWS permissions to the IAM role. Then, select "[Use ARN]" to authenticate using the ARN credentials from AWS STS.</p>
						</this.EPTabContent>
					</TabPanel>
					<TabPanel className="tab-pane">
						<this.EPTabContent 
							title={`Export to Azure Blob (epazureblob)`} 
							heading="Azure Blob & Data Lake v2 Connections" 
							action_columns="3"
							browsable="true"
							config={'ep_azure_blob'} >
							<p>Setup connections for Azure Blob object storage or Data Lake repositories.  Please note:</p>
							<ul>
								<li>If Azure AD is selected, the credential's Username must be the application ID and the Realm must be the the Tenant ID.</li>
								<li>Storage accounts with hierarchical namespace enabled must have the Type set to Data Lake.</li>
								<li>Browse functionality requires the "Storage Blob Data Contributor" role assignment on storage accounts, in addition to the "Storage Queue Data Contributor" role on Data Lake storage accounts.</li>
							</ul>
						</this.EPTabContent>
					</TabPanel>
					<TabPanel className="tab-pane">
						<this.EPTabContent 
							title={`Export to Box (epbox)`} 
							heading="Box Connections" 
							action_columns="3"
							browsable="true"
							config={'ep_box'}>
								<p>Setup connections to Box.com account(s).</p>
								<p>In your <a href="https://app.box.com/developers/console/newapp">Box Admin Console</a>, create a new Custom App with Server Authentication (with JWT) and create a new key pair to get this information. Then, submit the new app for authorization.</p>
						</this.EPTabContent>
					</TabPanel>
					<TabPanel className="tab-pane">
						<this.EPTabContent 
							title={`Export to SFTP (epsftp)`} 
							heading="SFTP Connections" 
							action_columns="3"
							browsable="true"
							config={'ep_sftp'} >
								<p>Setup connections to SFTP (SSH File Transfer Protocol) endpoints.</p>
								<p>Choose from one of the following. Note that the username will always be retrieved from the referenced "password" credential.</p>
								<ul>
									<li>Password authentication; no private key required.</li>
									<li>Public key authentication with unencrypted private key (not recommended); no password required (specify a password credential to reference the username). Not permitted in Splunk Cloud.</li>
									<li>Public key authentication with encrypted private key; no password required (specify a password credential to reference the username), passphrase required.</li>
								</ul>
								<p>If a password is present in your credential and a private key is also specified, the private key will be used for authentication.</p>
							</this.EPTabContent>
					</TabPanel>
					<TabPanel className="tab-pane">
						<this.EPTabContent 
							title={`Export to SMB (epsmb)`} 
							heading="SMB Connections" 
							action_columns="3"
							browsable="true"
							config={'ep_smb'} >
								Setup connections to Windows SMB/CIFS file shares.
						</this.EPTabContent>
					</TabPanel>
				</Tabs>
				<Suspense fallback={<div style={{width: "100%", margin: "25px auto", textAlign: "center"}}>Loading Script...</div>}>
					{this.state.show_file_browser && (
						<FileBrowserModal 
							id="file_browser" 
							instanceId="ep" 
							show={this.state.show_file_browser}
							onHide={ () => {
								console.log("Setting state from FileBrowserModal");
								this.setState({
									show_file_browser: false,
									file_list: [],
									folder_chain: []
								})}
							}
							location={`${config_descriptions[this.state.current_config]} / ${this.state.current_config_alias}`} 
							file_list={this.state.file_list}
							folder_chain={this.state.folder_chain}
							onFileAction={this.handleFileAction} />
					)}
				</Suspense>
			</div>
		);
	}
}


export default withSnackbar(App);
//export default App;