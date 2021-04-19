
import 'bootstrap/dist/css/bootstrap.min.css';
import $ from 'jquery';
import Popper from 'popper.js';
import 'bootstrap/dist/js/bootstrap.bundle.min';
import React, {forwardRef} from 'react';
/*import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';*/
import MaterialTable from 'material-table';
import uuid from 'react-uuid'
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
	number: (field, value) => {
		if (validator.isEmpty(value)) {
			return {helperText: `${field} is empty`, isValid: false};
		}
		if (!validator.isFloat(value) || !validator.isInt(value)) {
			return {helperText: `${field} is not a number`, isValid: false};
		}
		return true
	},
	bool: (field, value) => {
		if (validator.isEmpty(value)) {
			return {helperText: `${field} is empty`, isValid: false};
		}
		if (!validator.isBoolean(value)) {
			return {helperText: `${field} is not a boolean`, isValid: false};
		}
		return true
	},
	string: (field, value) => {
		if (validator.isEmpty(value)) {
			return {helperText: `${field} is empty`, isValid: false};
		}
		if (!validator.isAscii(value)) {
			return {helperText: `${field} is not an ASCII string`, isValid: false};
		}
		return true
	},
	time: (field, value) => {
		if (validator.isEmpty(value)) {
			return {helperText: `${field} is empty`, isValid: false};
		}
		if (!validator.isDate(value)) {
			return {helperText: `${field} is not a date`, isValid: false};
		}
		return true
	}
}

class App extends React.Component {
	constructor(props) {
		super(props);
		let c = props.columns || "", use_config_columns = c.length > 0,
			c2 = [{title: "_key", field: '_key', readonly: true, hidden: true}];
		c.split(",").map((k) => {
			c2.push({
				title: k,
				field: k,
				hidden: false,
				readonly: false
			})
		})
		this.state = {
			data: [],
			columns: c2,
			use_config_columns: use_config_columns
		}
		this.updateParentState = this.updateParentState.bind(this);
	}

	get_aws_data = () => {
		return {}
		/*
		return new Promise((resolve, reject) => {
			this.props.splunk.get(`storage/collections/data/test`).then((d) => {
				let clear = JSON.parse(d);
				resolve(clear);
			})
		});
		*/
	}
	get_aws_config = () => {
		return {}
		/*
		return new Promise((resolve, reject) => {
			this.props.splunk.get(`storage/collections/config/test`)
				.then((d) => {
					let clear = JSON.parse(d);
					resolve(clear["entry"][0]["content"]);
				});
		});
		*/
	}
	delete_aws_item = (item) => {
		return {}
		/*
		return new Promise((resolve, reject) => {
			this.props.splunk.request(`storage/collections/data/test/${item}`,
				"DELETE",
				{"output_mode": "json"},
				null,
				null,
				{"Content-Type": "application/json"}, null)
				.error(data => {
					reject(data)
				})
				.done(data => {
					resolve(data)
				});
		});
		*/
	}
	put_aws_item = (item) => {
		return {}
		/*
		return new Promise((resolve, reject) => {
			this.props.splunk.request(`storage/collections/data/test`,
				"POST",
				{"output_mode": "json"},
				null,
				JSON.stringify(item),
				{"Content-Type": "application/json"}, null)
				.error(data => {
					reject(data)
				})
				.done(data => {
					resolve(JSON.parse(data))
				});
		});
		*/
	}
	update_aws_item = (item) => {
		return {}
		/*
		return new Promise((resolve, reject) => {
			this.props.splunk.request(`storage/collections/data/test/${item["_key"]}`,
				"POST",
				{"output_mode": "json"},
				null,
				JSON.stringify(item),
				{"Content-Type": "application/json"}, null)
				.error(data => {
					reject(data)
				})
				.done(data => {
					resolve(JSON.parse(data))
				});
		});
		*/
	}
	put_aws_bulk_items = (items) => {
		return {}
		/*
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
		*/
	}

	componentDidMount = () => {
		// do things on mount of component
		// This will use the native splunk JS object to "get" an endpoint. "post" is also supported.
		/*
		this.get_aws_data().then((d) => {
			this.setState({"data": d});
		})
		this.get_aws_config().then((d) => {
			let f = Object.keys(d);
			let c = this.state.columns.map((k) => {
				if (f.includes(`field.${k.field}`)) {
					k["validate"] = rowData => validators[d[`field.${k.field}`]](k.field, `${rowData[k.field]}`);
				}
				return k;
			})
			this.setState({"columns": c});
		})*/

	};

	updateParentState = (prop) => {
		this.setState(Object.assign(this.state, prop));
	};

	render() {
		let self = this;
		/*if (self.state.columns.length < 3) {
			return (<div>
				<h1>Table for {self.props.kvstore}</h1>
				<blockquote>Must define at least one column in <i>data-columns</i> attribute.</blockquote>
			</div>)
		}*/
		return (
			<div>
				<div id="tab_container" className="container">
					<ul id="tabs_list" className="nav nav-tabs">
						<li className="nav-item active">
							<a href="#internal_row_1" className="nav-link active toggle-tab">General</a>
						</li>
						<li className="nav-item">
							<a href="#internal_row_2" className="nav-link toggle-tab">HTTP Event Collector</a>
						</li>
						<li className="nav-item">
							<a href="#internal_row_3" className="nav-link toggle-tab">AWS S3</a>
						</li>
						<li className="nav-item">
							<a href="#internal_row_4" className="nav-link toggle-tab">Box</a>
						</li>
					</ul>


					<div className="tab-content container">
						<div className="tab-pane show active" id="internal_row_1">
							<div className="form form-horizontal form-complex">
								<h1>General Settings</h1>
								<label className="control-label" for="log_level">Log Level</label>
								<select className="controls controls-block controls_text" style={{width: '150px'}} id="log_level">
									<option value="DEBUG">Debug</option>
									<option value="INFO">Info</option>
									<option value="WARNING">Warning</option>
									<option value="ERROR">Error</option>
									<option value="CRITICAL">Critical</option>
								</select>
							</div>
						</div>
						<div className="tab-pane" id="internal_row_2">
							<div className="form form-horizontal form-complex">
								<h1>HTTP Event Collector Event Push (hep)</h1>
								<label className="control-label" for="hec_host">Destination Host</label>
								<input className="controls controls-block controls_text" type="text" id="hec_host"/>
								
								<label className="control-label" for="hec_port">Destination Port (Default 8088)</label>
								<input className="controls controls-block controls_text" type="text" id="hec_port"/>
								
								<label className="control-label" for="hec_token">Destination Host Token Value</label>
								<input className="controls controls-block controls_text" type="text" id="hec_token"/>
								
								<label className="control-label" for="hec_ssl">SSL</label>
								<input className="controls controls-block" type="checkbox" id="hec_ssl"/>
							</div>
						</div>
						<div className="tab-pane" id="internal_row_3">
							<div className="form form-horizontal form-complex">
								<h1>Amazon Web Services S3 Event Push (s3ep)</h1>
								
								<label className="control-label" for="use_arn">Authenticate Using Assumed Role</label>
								<input className="controls controls-block" type="checkbox" id="use_arn"/>
								
								<label className="control-label" for="default_s3_bucket">Default S3 Bucket</label>
								<input className="controls controls-block controls_text" type="text" id="default_s3_bucket"/>
								
								<h2>AWS Credentials - New/Edit</h2>
								
								<label className="control-label" for="cred_alias">Credential Name/Alias</label>
								<input className="controls controls-block controls_text" type="text" id="cred_alias"/>
								
								<label className="control-label" for="cred_accesskey">Access Key ID</label>
								<input className="controls controls-block controls_text" type="text" id="cred_accesskey"/>
								
								<label className="control-label" for="cred_secretkey">Secret Access Key</label>
								<input className="controls controls-block controls_text" type="password" id="cred_secretkey"/>
								
								<label className="control-label" for="cred_default">Set as Default</label>
								<input className="controls controls-block" type="checkbox" id="cred_default"/>
							</div>
							<div className="form form-horizontal form-complex">
								<h2>AWS Credentials - Configured</h2>
								<label className="control-label" for="cred_id">Configured Credentials</label>
								<select id="cred_id" size="10" style={{height: '100%'}}></select>
								<input type="hidden" name="cred_id_hidden" id="cred_id_hidden"/>
							</div>
							<div id="credential_buttons"> 
								<button type="button" id="credential_modify" className="btn credential-btn pull-left">Modify</button> <br/>
								<button type="button" id="credential_delete" className="btn credential-btn pull-left">Delete</button>
							</div>
							<div>
								<p id="credentials_footnote">* Default</p>
							</div>
						</div>
						<div className="tab-pane" id="internal_row_4">
							<div className="form form-horizontal form-complex">

								<h1 style={{paddingBottom: '5px'}}>Box (boxep)</h1>
								<div style={{width: '700px', paddingBottom: '15px'}}>
									<p>In your <a href="https://app.box.com/developers/console/newapp">Box admin portal</a>, create a new Custom App with Server Authentication (with JWT) and create a new key pair to get this information. Then, submit the new app for authorization.</p>
								</div>
								<label className="control-label" for="default_folder">Default Folder</label>
								<input className="controls controls-block controls_text" type="text" value="/" id="default_folder"/>

								<label className="control-label" for="enterpriseID">Enterprise ID</label>
								<input className="controls controls-block controls_text" type="text" id="enterpriseID"/>

								<label className="control-label" for="clientID">Client ID</label>
								<input className="controls controls-block controls_text" type="text" id="clientID"/>

								<label className="control-label" for="clientSecret">Client Secret</label>
								<input className="controls controls-block controls_text" type="password" id="clientSecret"/>

								<label className="control-label" for="publicKeyID">Public Key ID</label>
								<input className="controls controls-block controls_text" type="text" id="publicKeyID"/>

								<label className="control-label" for="privateKey">Private Key</label>
								<textarea className="controls controls-block controls_text" id="privateKey"/>

								<label className="control-label" for="passphrase">Passphrase</label>
								<input className="controls controls-block controls_text" type="password" id="passphrase"/>
							</div>
						</div>
					</div>
				</div>

				<div>
					<p id="settings_message" class="result_message" style={{display: 'none'}}></p>
					<p id="aws_message" class="result_message" style={{display: 'none'}}></p>
					<p id="hec_message" class="result_message" style={{display: 'none'}}></p>
					<p id="box_message" class="result_message" style={{display: 'none'}}></p>
				</div>
				<div class="modal-footer" style={{paddingLeft: '0px', marginTop: '-5px', float: 'left', width: '100%'}}>
					<button type="button" id="setup_save" class="btn btn-primary custom-btn">Save</button>
				</div>
			</div>

		);
	}
}


export default App;