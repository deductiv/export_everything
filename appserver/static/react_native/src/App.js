/* Copyright 2021 Deductiv Inc.
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
# Version: 2.0.0 (2021-04-26)
*/

import React, {forwardRef} from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { FormControl, TextField, Select, InputLabel, MenuItem, Checkbox, Button } from '@material-ui/core';
import MaterialTable from '@material-table/core';
import uuid from 'react-native-uuid';
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
import { withSnackbar } from 'notistack';
import validator from 'validator';

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
	Export: forwardRef((props, ref) => <SaveAlt {...props} ref={ref}/>)
};

const validators = {
	number: (value) => {
		if (value === undefined || !validator.isFloat(value) || !validator.isInt(value)) {
			return {isValid: false};
		}
		return {isValid: true}
	},
	bool: (value) => {
		if (value === undefined || (value !== true && value !== false)) {
			return {isValid: false};
		}
		return {isValid: true}
	},
	string: (value) => {
		if (value === undefined || validator.isEmpty(value) || !validator.isAscii(value)) {
			return {isValid: false};
		}
		return {isValid: true}
	},
	time: (value) => {
		if (value === undefined || !validator.isDate(value)) {
			return {isValid: false};
		}
		return true
	},
	uuid: (value) => {
		if (value === undefined || !validator.isUUID(value, 4)) {
			return {isValid: false};
		}
		return {isValid: true}
	}
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
	actionsCellStyle: {
		padding: '0'}
};






class App extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			error_states: { 
				secret_key: true, 
				private_key: true,
				client_secret: true,
				passphrase: true
			},
			ep_general: {},
			// table lists
			ep_hec: [], 
			ep_aws: [],
			ep_box: []
		}

		this.get_config_stanza("ep_general", "settings").then((d) => {
			this.setState({"ep_general": d});
		})
		this.refresh_tables();
		
		this.validate_secret_key = this.validate_secret_key.bind(this);
		this.validate_password_field = this.validate_password_field.bind(this);
		this.refresh_tables = this.refresh_tables.bind(this);
		this.dict_to_querystring = this.dict_to_querystring.bind(this);
		this.rest_to_rows = this.rest_to_rows.bind(this);
		this.list_table_fields = this.list_table_fields.bind(this);
		this.unset_default_entry = this.unset_default_entry.bind(this);
		this.get_config_stanza = this.get_config_stanza.bind(this);
		this.get_config = this.get_config.bind(this);
		this.put_config_item = this.put_config_item.bind(this);
		this.add_row_data = this.add_row_data.bind(this);
		this.update_config_item = this.update_config_item.bind(this);
		this.update_row_data = this.update_row_data.bind(this);
		this.delete_config_item = this.delete_config_item.bind(this);
		this.delete_row_data = this.delete_row_data.bind(this);
		this.updateParentState = this.updateParentState.bind(this);

	}

	columns = {
		ep_hec: [
			{ title: "Stanza", field: "stanza", hidden: true },
			{ title: "Name/Alias", field: "alias", width: "20%", validate: rowData => validators.string(rowData.alias) }, 
			{ title: "Hostname", field: "host", width: "35%", validate: rowData => validators.string(rowData.host) },
			{ title: "TCP Port", field: "port", width: "10%" },
			{ title: "HEC Token", field: "token", width: "20%", validate: rowData => validators.uuid(rowData.token) },
			{ title: "SSL", field: "ssl", type: "boolean", width: "5%", initialEditValue: 1, headerStyle: center_table_header_styles } ,
			{ title: "Default", field: "default", type: "boolean", width: "5%", headerStyle: center_table_header_styles }
		],
		ep_aws_s3: [
			{ title: "Stanza", field: "stanza", hidden: true },
			{ title: "Name/Alias", field: "alias", width: "15%", validate: rowData => validators.string(rowData.alias) }, 
			{ title: "Default Bucket ID", field: "default_s3_bucket", width: "20%" },
			{ title: "Use ARN", field: "use_arn", type: "boolean", width: "5%", headerStyle: center_table_header_styles },
			{ title: "Access Key ID", field: "access_key_id", width: "15%", 
				validate: rowData => ((validators.bool(rowData.use_arn).isValid && rowData.use_arn) || validators.string(rowData.access_key_id).isValid)
			},
			{ title: "Secret Access Key", field: "secret_key", width: "15%", cellStyle: cell_format,
				render: rowData => <span className="password_field">{ ((rowData.secret_key === undefined || rowData.secret_key == '') ? '' : '*'.repeat(12))}</span>,
				editComponent: props => (
					<TextField
						type="password"
						value={props.value}
						error={this.state.error_states['secret_key']}
						inputProps={{ "placeholder": "Secret Access Key" }}
						onChange={e => {props.onChange(e.target.value)}}
						/*onRowDataChange={event => { console.log(JSON.stringify(props)); console.log(event.target.id); console.log(event.target.value); if (props.rowData.use_arn) { console.log("Disable the input here"); props.disabled = true; } }}*/
					/>), 
				validate: rowData => this.validate_secret_key(rowData)
			},
			{ title: "Region", field: "region", width: "10%", validate: rowData => validators.string(rowData.region) }, 
			{ title: "Endpoint URL\n(Blank for AWS S3)", field: "endpoint_url", width: "15%" },
			{ title: "Compress Output", field: "compress", type: "boolean", width: "5%", headerStyle: center_table_header_styles },
			{ title: "Default", field: "default", type: "boolean", width: "5%", headerStyle: center_table_header_styles }
		],
		ep_box: [
			{ title: "Stanza", field: "stanza", hidden: true },
			{ title: "Name/Alias", field: "alias", width: "14%", validate: rowData => validators.string(rowData.alias) }, 
			{ title: "Default Folder", field: "default_folder", width: "20%" }, 
			{ title: "Enterprise ID", field: "enterprise_id", width: "10%", validate: rowData => validators.string(rowData.enterprise_id) },
			{ title: "Client ID", field: "client_id", width: "9%", validate: rowData => validators.string(rowData.client_id) },
			{ title: "Client Secret", field: "client_secret", width: "9%", validate: rowData => this.validate_password_field(rowData, 'client_secret'),
				render: rowData => <span className="password_field">{((rowData.client_secret === undefined || rowData.client_secret == '') ? '' : '*'.repeat(12))}</span>,
				editComponent: props => (
					<TextField
						error={this.state.error_states.client_secret}
						type="password"
						value={props.value}
						inputProps={{"placeholder": "Client Secret"}}
						onChange={e => {props.onChange(e.target.value)}}
					/>) },
			{ title: "Public Key ID", field: "public_key_id", width: "9%", validate: rowData => validators.string(rowData.public_key_id) },
			{ title: "Private Key", field: "private_key", width: "36%", cellStyle: { wordBreak: 'keep-all'}, validate: rowData => this.validate_password_field(rowData, 'private_key'),
				render: rowData => <span className="password_field">{((rowData.private_key === undefined || rowData.private_key == '') ? '' : '[encrypted]')}</span>,
				editComponent: ({ value, onChange }) => (
					<TextField
						error={this.state.error_states.private_key}
						onChange={e => {onChange(e.target.value)}}
						value={value}
						placeholder="Private Key"
						multiline
						rows={1}
						rowsMax={4}
						/>) },
			{ title: "Passphrase", field: "passphrase", width: "8%", validate: rowData => this.validate_password_field(rowData, 'passphrase'),
				render: rowData => <span className="password_field">{((rowData.passphrase === undefined || rowData.passphrase == '') ? '' : '*'.repeat(12))}</span>,
				editComponent: props => (
					<TextField
						error={this.state.error_states.passphrase}
						type="password"
						value={props.value}
						inputProps={{"placeholder": "Passphrase"}}
						onChange={e => {props.onChange(e.target.value)}}
					/>) },
			{ title: "Compress Output", field: "compress", type: "boolean", width: "5%", headerStyle: center_table_header_styles },
			{ title: "Default", field: "default", type: "boolean", width: "5%", headerStyle: center_table_header_styles }
		]
	};

	validate_secret_key = (rowData) => {
		console.log("Validate secret key called");
		let error_result = !((validators.bool(rowData.use_arn).isValid && rowData.use_arn) || validators.string(rowData.secret_key).isValid );
		if (error_result !== this.state.error_states.secret_key) {
			this.setState(prev_state => ({
				error_states: {
					...prev_state.error_states,
					secret_key: error_result
				}
			}));
		}
		console.log("secret_key result = " + error_result);
		return !error_result;
	}

	validate_password_field = (rowData, field) => {
		console.log("Validate password field called for " + field);
		let error_result = !(validators.string(rowData[field]).isValid );
		if (error_result !== this.state.error_states[field]) {
			this.setState(prev_state => ({
				error_states: {
					...prev_state.error_states,
					[field]: error_result
				}
			}));
		}
		console.log(field + " result = " + error_result);
		return !error_result;
	}

	refresh_tables = () => {
		let tables = Object.keys(this.columns);
		for (let table of tables) {
			this.get_config(table).then((d) => {
				d = this.rest_to_rows(table, d);
				this.setState({[table]: d});
			})
		}
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
	unset_default_entry = (config_file, new_default_stanza) => {
		let config_entries = [...this.state[config_file]];
		for (let old_entry of config_entries) {
			if ( old_entry.stanza != new_default_stanza && old_entry.default ) {
				let new_entry = {...old_entry};
				delete new_entry.tableData;
				new_entry.default = false;
				this.update_row_data(config_file, new_entry, old_entry);
			}
		}
	}

	get_config_stanza = (config_file, stanza) => {
		return new Promise((resolve, reject) => {
			this.props.splunk.get(`event_push/${config_file}/${stanza}`).then((d) => {
				let clear = JSON.parse(d);
				//resolve(clear);
				resolve(clear["entry"][0]["content"]);
			})
		});
	}
	get_config = (config_file) => {
		return new Promise((resolve, reject) => {
			this.props.splunk.get(`event_push/${config_file}`)
				.then((d) => {
					let clear = JSON.parse(d);
					resolve(clear["entry"]);
					//resolve(clear["entry"][0]["content"]);
				});
		});
	}
	
	put_config_item = (config_file, items) => {
		//console.log(`config = ${config_file}`);
		//console.log(`items = ${JSON.stringify(items)}`);
		
		return new Promise((resolve, reject) => {
			if ( 'stanza' in items ) {
				var rest_endpoint = `event_push/${config_file}/${items.stanza}`;
			} else {
				var rest_endpoint = `event_push/${config_file}`;
			};

			this.props.splunk.request(rest_endpoint,
				"POST",
				{"output_mode": "json"},
				null,
				this.dict_to_querystring(items),
				{"Content-Type": "application/x-www-form-urlencoded"},
				 null
				)
			.error(data => {
				this.props.enqueueSnackbar('Error creating record', notistack_options('error'));
				reject(data)
			})
			.done(data => {
				this.refresh_tables();
				this.props.enqueueSnackbar('Record created successfully', notistack_options('success'));
				resolve(JSON.parse(data))
			});
		});
	}
	// Set the state data when adding a configuration item using the table view
	add_row_data = (config_file, new_data) => {
		return new Promise((resolve, reject) => {
			setTimeout(async () => {
				new_data.stanza = uuid.v4();
				const dataNew = [...this.state[config_file]];
				// If "default" is set for this new record, unset it for any other records that might have it
				if ( (new_data.default === undefined) ? false : new_data.default ) {
					this.unset_default_entry(config_file, new_data.stanza);
				}
				await this.put_config_item(config_file, new_data);
				dataNew.push(new_data);
				this.setState({[config_file]: dataNew});
				resolve();
			}, 1000);
		});
	}

	// Update the configuration file using the EAI REST endpoint
	update_config_item = (config_file, item) => {
		console.log("Item = " + JSON.stringify(item));
		return new Promise((resolve, reject) => {
			this.props.splunk.request(`event_push/${config_file}/${item.stanza}`,
				"POST",
				{"output_mode": "json"},
				null,
				this.dict_to_querystring(item),
				{"Content-Type": "application/x-www-form-urlencoded"},
				null
			)
			.error(data => {
				this.props.enqueueSnackbar('Error updating record', notistack_options('error'));
				reject(data)
			})
			.done(data => {
				this.refresh_tables();
				this.props.enqueueSnackbar('Update successful', notistack_options('success'));
				resolve(JSON.parse(data))
			});
		});
	}
	// Update the UI and state
	update_row_data = (config_file, new_data, old_data) => {
		return new Promise((resolve, reject) => {
			setTimeout(async () => {
				const dataUpdate = [...this.state[config_file]];
				const index = old_data.tableData.id;
				dataUpdate[index] = new_data;
				// If "default" is set for this updated record, unset it for any other records that might have it
				if ( (new_data.default === undefined) ? false : new_data.default ) {
					this.unset_default_entry(config_file, new_data.stanza);
				}
				await this.update_config_item(config_file, new_data);
				this.setState({[config_file]: dataUpdate});
				resolve();
			}, 1000)
		})
	}

	delete_config_item = (config_file, stanza) => {
		return new Promise((resolve, reject) => {
			this.props.splunk.request(`event_push/${config_file}/${stanza}`,
				"DELETE",
				{"output_mode": "json"},
				null,
				null,
				{"Content-Type": "application/x-www-form-urlencoded"}, 
				null
			)
			.error(data => {
				reject(data)
				this.props.enqueueSnackbar('Error deleting record', notistack_options('error'));
			})
			.done(data => {
				resolve(data)
				this.props.enqueueSnackbar('Record deleted successfully', notistack_options('success'));
			});
		});
	}
	delete_row_data = (config_file, oldData) => {
		return new Promise((resolve, reject) => {
			setTimeout(async () => {
				const dataDelete = [...this.state[config_file]];
				const index = oldData.tableData.id;
				dataDelete.splice(index, 1);
				await this.delete_config_item(config_file, oldData.stanza);
				this.setState({[config_file]: dataDelete});
				resolve();
			}, 1000)
		})
	}


	/*
	put_config_bulk_items = (config_file, items) => {
		return new Promise((resolve, reject) => {
			this.props.splunk.request(`storage/collections/data/test/batch_save`,
				"POST",
				{"output_mode": "json"},
				null,
				JSON.stringify(items),
				{"Content-Type": "application/json"}, null)
				.error(data => {
					reject(data)
				})
				.done(data => {
					resolve(JSON.parse(data))
				});
		});
	}
	update_bulk_row_data = (config_file, changes) => {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				let items = this.state[config_file], keyed = {}, change_items = [];
				Object.keys(changes).map((l) => {
					keyed[changes[l]["oldData"]["stanza"]] = {...changes[l]["oldData"], ...changes[l]["newData"]};
					change_items.push(keyed[changes[l]["oldData"]["stanza"]]);
					return l;
				})
				let keys = Object.keys(keyed);
				let updatedItems = items.map((k) => {
					if (keys.includes(k.stanza)) {
						return keyed[k.stanza];
					} else {
						return k;
					}
				})
				self.put_config_bulk_items(config_file, change_items);
				self.setState({[config_file]: updatedItems});
				resolve();
			}, 1000);
		})
	}
	*/
	componentDidMount = () => {
		// Future use
	};

	updateParentState = (prop) => {
		this.setState(Object.assign(this.state, prop));
	};

	render() {
		let self = this;

		return (
			<div>
				<Tabs id="tabs_list" className="nav nav-tabs" 
					defaultIndex={0} transition={false} >
					<TabList className="nav nav-tabs">
						<Tab className="nav-item"><a href="#" className="toggle-tab">General</a></Tab>
						<Tab className="nav-item"><a href="#" className="toggle-tab">Splunk HEC</a></Tab>
						<Tab className="nav-item"><a href="#" className="toggle-tab">AWS S3-Compatible</a></Tab>
						<Tab className="nav-item"><a href="#" className="toggle-tab">Box</a></Tab>
					</TabList>
					<TabPanel className="tab-pane">
						<div className="form form-horizontal form-complex">
							<h1>General Settings</h1>
							<FormControl id="general_form">
								<InputLabel id="logging_label">Logging Level</InputLabel>
								<Select labelId="logging_label" 
									id="log_level" 
									style={{ width: "150px" }}
									value={(this.state.ep_general.log_level === undefined) ? "INFO" : this.state.ep_general.log_level}
									onChange={(event) => {
										this.update_config_item( 
											"ep_general", 
											{
												stanza: 'settings',
												log_level: event.target.value
											}
										)
										this.setState({"ep_general": {log_level: event.target.value}});
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
							<h1>HTTP Event Collector Event Push (hep)</h1>
							<div className="panel-element-row">
								<MaterialTable
									title={
										<div className="form form-complex">
											<h2>Splunk HTTP Event Collector Connections</h2>
										</div>
									}
									icons={tableIcons}
									columns={this.columns.ep_hec}
									data={self.state.ep_hec}
									editable={{
										onRowAdd: newData => this.add_row_data("ep_hec", newData),
										onRowUpdate: (newData, oldData) => this.update_row_data("ep_hec", newData, oldData),
										onRowDelete: oldData => this.delete_row_data("ep_hec", oldData)/*,
										onBulkUpdate: changes => this.update_bulk_row_data("ep_hec", changes)*/
									}}
									options={table_options}
								/>
							</div>
						</div>
					</TabPanel>
					<TabPanel className="tab-pane">
						<div className="form form-horizontal form-complex">
							<div>
								<h1>Amazon Web Services S3 Event Push (s3ep)</h1>
							</div>
							<div className="panel-element-row">
								<MaterialTable
									title={
										<div className="form form-complex">
											<h2>AWS S3-Compatible Connections</h2>
										</div>
									}
									icons={tableIcons}
									columns={this.columns.ep_aws_s3}
									data={self.state.ep_aws_s3}
									editable={{
										onRowAdd: newData => this.add_row_data("ep_aws_s3", newData),
										onRowUpdate: (newData, oldData) => this.update_row_data("ep_aws_s3", newData, oldData),
										onRowDelete: oldData => this.delete_row_data("ep_aws_s3", oldData)/*,
										onBulkUpdate: changes => this.update_bulk_row_data("ep_aws_s3", changes)*/
									}}
									options={table_options}
								/>
							</div>
						</div>
					</TabPanel>
					<TabPanel className="tab-pane">
						<div className="form form-horizontal form-complex">
							
							<h1 style={{paddingBottom: '5px'}}>Box (boxep)</h1>
							<div style={{width: '700px', paddingBottom: '15px'}}>
								<p>In your <a href="https://app.box.com/developers/console/newapp">Box Admin Console</a>, create a new Custom App with Server Authentication (with JWT) and create a new key pair to get this information. Then, submit the new app for authorization.</p>
							</div>
							<div className="panel-element-row">
								<MaterialTable
									title={
										<div className="form form-complex">
											<h2>Box Connections</h2>
										</div>
									}
									icons={tableIcons}
									columns={this.columns.ep_box}
									data={self.state.ep_box}
									editable={{
										onRowAdd: newData => this.add_row_data("ep_box", newData),
										onRowUpdate: (newData, oldData) => this.update_row_data("ep_box", newData, oldData),
										onRowDelete: oldData => this.delete_row_data("ep_box", oldData)/*,
										onBulkUpdate: changes => this.update_bulk_row_data("ep_box", changes)*/
									}}
									options={table_options}
								/>
							</div>
						</div>
					</TabPanel>
				</Tabs>
			</div>
		);
	}
}


export default withSnackbar(App);
//export default App;