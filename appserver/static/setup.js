/* jshint esversion: 6 */
require([
	"splunkjs/mvc",
	"splunkjs/mvc/utils",
	"splunkjs/mvc/tokenutils",
	"underscore",
	"jquery",
	"splunkjs/mvc/simplesplunkview",
	"models/SplunkDBase",
	"splunkjs/mvc/sharedmodels",
	"splunkjs/mvc/simplexml",
	"splunkjs/mvc/tableview",
	"splunkjs/mvc/chartview",
	"splunkjs/mvc/searchmanager",
	"splunkjs/mvc/dropdownview",
	"splunkjs/mvc/textinputview",
	"splunkjs/mvc/multidropdownview",
	"splunk.util",
	"splunkjs/mvc/simplexml/element/single",
	"splunkjs/mvc/simpleform/formutils",
	"splunkjs/mvc/simplexml/ready!"
], function(
	mvc,
	utils,
	TokenUtils,
	_, //underscore
	$, //jquery
	SimpleSplunkView,
	SplunkDModel, //SplunkDBase
	sharedModels, //sharedmodels
	DashboardController, //simplexml
	TableView,
	ChartView,
	SearchManager,
	DropdownView,
	TextInputView,
	MultiDropdownView,
	splunkUtil,
	SingleElement,
	FormUtils
) {
	app = 'deductiv_hep';
	
	// Date.now workaround for IE8
	if (!Date.now) {
		Date.now = function() { return new Date().getTime(); };
	}
	
	function epoch_convert(epoch_timestamp) {
		var date = new Date(epoch_timestamp*1000);
		var iso = date.toISOString().match(/(\d{4}\-\d{2}\-\d{2})T(\d{2}:\d{2}:\d{2})/);
		return iso[1] + ' ' + iso[2];
	}
	
	// jQuery element is empty
	function isEmpty( el ){
		return !$.trim(el.html());
	}

	function addMultiLineBreaks(key, value) {
		var replaced_value = value.toString() + '<br/>';
		return replaced_value;
	}
	
	function bool(value) {
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
	function boolFlip(value) {
		if ( bool(value) ) {
			return false;
		} else {
			return true;
		}
	}
	function checkedIfTrue(value) {
		if ( bool(value) ) {
			return "checked";
		} else {
			return "";
		}
	}
	function stringOrArrayToArray(value) {
		if ( value !== undefined && value !== null && value.constructor !== Array ) {
			return [value];
		} else if ( value !== undefined && value !== null && value.constructor === Array ) {
			// value is an array already
			return value;
		} else {
			return null;
		}
	}
	function range(size, startAt = 0) {
		return [...Array(size).keys()].map(i => i + startAt);
	}

	function assign_value_to_element(id, v) {
		//console.log('Checked: ' + $('#' + id).prop('checked'));
		if (id.startsWith('credential')) {
			// Parse the credential
			var [alias, username, password] = v.split(':');
			if (alias != undefined && username != undefined && password != undefined ) {
				if ( alias.length == 0 ) {
					alias = id;
				}
				var option_html;
				// Put an asterisk next to the default credential
				if ( default_credential == id || default_credential == alias ) {
					option_html = `<option value="${id}">${alias} *</option>`;
				} else {
					option_html = `<option value="${id}">${alias}</option>`;
				}
				// Append the option to the select box
				$('#cred_id').append(option_html);

				// Find the minimum unused ID # for the next credential to be set
				for ( var c=1; c<=20; c++ ) {
					cs = 'credential' + c.toString();
					// If this credential is not set for either config
					if (!( new_config.aws[cs] || config.aws[cs] )) {
						//console.log(cs + ' is not set');
						next_credential = cs;
						break;
					}
				}
			}
		} else if (checkbox_ids.includes(id)) {
			$('#' + id).prop('checked', bool(v));
		} else {
				$('#' + id).val(v);
		}
	}

	// Load the configuration and populate the form fields
	//var uri = Splunk.util.make_url(`/splunkd/__raw/servicesNS/nobody/${app}/deductiv/hep_setup?output_mode=json`);
	var uri = Splunk.util.make_url(`/splunkd/__raw/servicesNS/nobody/${app}/hep/hep_setup?output_mode=json`);
	var config = {};
	var new_config = { settings: {}, aws: {}, hec: {} };
	var default_credential = null;
	var next_credential;
	var credential_num_pattern = /[0-9]{1,2}$/;
	var checkboxes;
	var checkbox_ids = [];

	// Get the checkbox IDs so we can see if an ID is a checkbox when assigning values
	checkboxes = $('input[type=checkbox]').toArray();
	checkboxes.forEach(function(cb) {
		checkbox_ids.push(cb.id);
	});

	function populate_form() {
		// Populate the form values
		var key;
		for (key in config.settings) {
			if (config.settings[key] != undefined && config.settings[key].length > 0) {
				//console.log('hec ' + key + ' = ' + config.hec[key]);
				assign_value_to_element(key, config.settings[key]);
			}
		}
		for (key in config.aws) {
			if (config.aws[key] != undefined && config.aws[key].length > 0) {
				//console.log('aws ' + key + ' = ' + config.aws[key]);
				assign_value_to_element(key, config.aws[key]);
			}
		}
		if ( $('#cred_id').children('option').length == 0 ) {
			next_credential = "credential1";
		} else {
			// Find the minimum unused ID # for the next credential to be set
			for ( var c=1; c<=20; c++ ) {
				cs = 'credential' + c.toString();
				// If this credential is not set for either config
				if (!( config.aws[cs] )) {
					next_credential = cs;
					break;
				}
			}
		}
		for (key in config.hec) {
			if (config.hec[key] != undefined && config.hec[key].length > 0) {
				//console.log('hec ' + key + ' = ' + config.hec[key]);
				assign_value_to_element(key, config.hec[key]);
			}
		}
	}

	$.get(uri, function (result) {
		// Translate the values from the request
		var config_stanzas = result.entry;
		// Assign the values to config{}
		config_stanzas.forEach(function(entry) {
			config[entry.name] = entry.content;
		});

		// Get the default credential first
		default_credential = config.aws.default_credential;

		// Populate the form values
		populate_form();
	}) .fail( function(e) { 
		//if(e.status == 404){}
		console.log("Failed with error: " + e.status); 
	}); // end get/fail

	// Clicked the AWS credential modify button
	$(document).on('click', '#credential_modify', function(event) {
		// Load the credential fields into the form
		var cred_key = $( "#cred_id" ).val();
		cred = config.aws[cred_key];
		//console.log(cred);
		var [alias, username, password] = cred.split(':');

		// Fill the HTML form data
		$('#cred_alias').val(alias);
		$('#cred_accesskey').val(username);
		$('#cred_secretkey').val('****************');
		// Set the hidden form value to the cred_key (e.g. credential1)
		$('#cred_id_hidden').val(cred_key);
		// Set the checkbox if it's the default credential
		if ( default_credential == cred_key || default_credential == alias ) {
			$('#cred_default').prop('checked', true);
		} else {
			$('#cred_default').prop('checked', false);
		}
	});

	// Clicked the AWS credential delete button
	$(document).on('click', '#credential_delete', function(event) {
		// Load the credential fields from the form
		var cred_key = $( "#cred_id" ).val();
		cred = config.aws[cred_key];
		console.log(cred);
		var [alias, username, password] = cred.split(':');

		new_config.aws[cred_key] = '';
		// Unset the default if we're deleting the default credential
		if ( default_credential == cred_key || default_credential == alias ) {
			new_config.aws.default_credential = '';
			default_credential = '';
		}
		console.log(new_config.aws);
		// Delete the option from the #cred_id select box
		$( `#cred_id option[value="${cred_key}"]`).remove();
	});

	$(document).on("click", "#setup_save", function(event){
		// Button clicked
		console.log("Saving configuration changes");
		
		checkboxes = $('input[type=checkbox]').toArray();
		texts = $('input[type=text], input[type=password], #log_level').toArray();
		hiddens = $('input[type=hidden]').toArray();
		
		// See if a new credential is being added
		if ($('#cred_alias').val() != undefined && $('#cred_alias').val().length > 0) {
			// We have some data
			if ($('#cred_id_hidden').val() != undefined && $('#cred_id_hidden').val().length > 0) {
				// We are modifying a credential entry
				cred_key = $('#cred_id_hidden').val();
			} else {
				// This is a new entry
				cred_key = next_credential;
			}
			asterisk_pattern = /^\*+$/;
			var secret_key;
			if ($('#cred_secretkey').val() != undefined && $('#cred_secretkey').val().match(asterisk_pattern) == null) {
				// We have a newly entered value for secret key
				secret_key = $('#cred_secretkey').val().trim();
			} else {
				// Use the one from the originally downloaded config
				secret_key = config.aws[cred_key].split(':')[2];
			}
			// Concatenate the 3 values to make the credential
			new_cred = $('#cred_alias').val().trim() + ':' + $('#cred_accesskey').val().trim() + ':' + secret_key;
			// See if this is the same as configured before
			if ( new_cred != config.aws[cred_key] ) {
				new_config.aws[cred_key] = new_cred;
			}

			if ( config.aws[cred_key] != undefined ) {
				original_alias = config.aws[cred_key].split(':')[0];
			}

			// Check to see if we are setting this as the default credential
			if ( bool($('#cred_default').prop('checked'))) {
				default_credential = cred_key;
				new_config.aws.default_credential = default_credential;

			// Get the original alias in case it matches the default_credential (default_credential can be alias or ID)
			} else if (default_credential == cred_key || (config.aws[cred_key] != undefined && default_credential == config.aws[cred_key].split(':')[0] )) {
				// Was it set before? If it was already set before, unset it.
				default_credential = '';
				new_config.aws.default_credential = '';
			}
			// Clear the form fields
			cred_fields = ['cred_alias', 'cred_accesskey', 'cred_secretkey', 'cred_id_hidden'];
			cred_fields.forEach(function(c) {
				$('#' + c).val('');
			});
			$('#cred_default').prop('checked', false);

			// Update the select box option
			$(`#cred_id option[value="${cred_key}"]`).remove();
			assign_value_to_element(cred_key, new_cred);
		}

		fields = {
			"settings": ['log_level'],
			"hec": ['hec_host', 'hec_token', 'hec_port', 'hec_ssl'],
			"aws": ['use_arn', 'default_s3_bucket']
		};
		
		checkboxes.forEach(function(checkbox) {
			id = checkbox.id;
			for (var section in fields) {
				if ( fields[section].includes(id) ) {
					val = $('#' + id).prop('checked');
					// Check to see if the configuration has changed
					//console.log(JSON.stringify(config));
					if ( config[section][id] != undefined ) {
						if ( bool(val) != bool(config[section][id]) ) {
							// If there has been a change, add to the new config
							new_config[section][id] = val;
						}
					}
				}
			}
		});
		
		texts.forEach(function(text) {
			id = text.id;
			for (var section in fields) {
				if ( fields[section].includes(id) ) {
					val = $('#' + id).val();
					// Check to see if the configuration has changed
					if ( val != config[section][id] && (val.length > 0 || config[section][id].length > 0 )) {
						new_config[section][id] = val;
					}
				}
			}
		});
		
		Object.keys(fields).forEach(function (section) {
			console.log('section = ' + section);
			if (Object.keys(new_config[section]).length > 0 ) {
				// Submit HEC settings
				var uri = Splunk.util.make_url(`/splunkd/__raw/servicesNS/nobody/${app}/hep/hep_setup/${section}`);
				var status_div = `#${section}_message`;
				//console.log(JSON.stringify(new_config[section]));
				$.ajax({
					url: uri,
					type: 'POST',
					headers: {'Content-Type': 'application/x-www-form-urlencoded'},
					data: $.param(new_config[section]),
					success: function (data) {
						//console.log(data);
						console.log(status_div);
						// Update the screen to show this was successful
						$(status_div).html(`The update to the ${section} configuration was successful.`);
						$(status_div).show();
						$('html, body').animate({ scrollTop: 0 }, 'fast');
						// Fade out after 5 seconds
						setTimeout(function(){ $(status_div).fadeOut(); }, 5000);
					},
					error: function(e) {
						console.log(e);
						// Update the screen to show this didn't work
						$(status_div).html(`The update to the ${section} configuration failed: ${e}`);
						$(status_div).show();
					},
					cache: false,
					contentType: false,
					processData: false
				});
			}
		});

		// Apply new_config to config
		for (var key1 in new_config) {
			for (var key2 in new_config[key1]) {
				config[key1][key2] = new_config[key1][key2];
			}
			new_config[key1] = {};
		}
		
		// Refresh the #cred_id select box
		$('#cred_id').empty();
		populate_form();
		
	}); // end save button click function

});