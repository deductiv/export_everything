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
	'bootstrap.tab',
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
	app = 'event_push';
	
	// The normal, auto-magical Bootstrap tab processing doesn't work for us since it requires a particular
	// layout of HTML that we cannot use without converting the view entirely to simpleXML. So, we are
	// going to handle it ourselves.
	let hideTabTargets = function () {

		let tabs = $('a[data-elements]');

		// Go through each toggle tab
		for (let c = 0; c < tabs.length; c++) {

			// Hide the targets associated with the tab
			let targets = $(tabs[c]).data("elements").split(",");

			for (let d = 0; d < targets.length; d++) {
				$('#' + targets[d], this.$el).hide();
			}
		}
	};

	let selectTab = function (e) {
		// Stop if the tabs have no elements
		if ($(e.target).data("elements") === undefined) {
			console.warn("Yikes, the clicked tab has no elements to hide!");
			return;
		}

		// Get the IDs that we should enable for this tab
		let toToggle = $(e.target).data("elements").split(",");

		// Hide the tab content by default
		hideTabTargets();

		// Now show this tabs toggle elements
		for (let c = 0; c < toToggle.length; c++) {
			$('#' + toToggle[c], this.$el).show();
		}
	};


	// Wire up the function to show the appropriate tab
	$('a[data-toggle="tab"]').on('shown', selectTab);

	// Show the first tab
	$('.toggle-tab').first().trigger('shown');

	// Make the tabs into tabs
	$('#tabs_list', this.$el).tab();
	

});