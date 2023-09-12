import React, { Suspense } from 'react'
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs'
import { FormControl, Select, InputLabel, MenuItem } from '@material-ui/core'
import MaterialTable from '@material-table/core'
import tableStyles from './TableStyles'
import { TabTemplate } from './TabTemplate'
import { LoadingOverlayAppConfig, LoadingOverlayFileBrowser } from './Overlays'
import { getServerInfo, getConfigStanza, updateConfigItem } from './HelpersSplunk'
import { handleTablesRefresh, handleRowAdd, handleRowUpdate, handleRowDelete } from './HelpersTable'
import { getColumns } from './TableColumns'
import { TabContents, TabDocs } from './TabContents'
import { FileBrowserModal } from './FileBrowserModal'
import c from './Constants'

// Stylesheets
import 'react-tabs/style/react-tabs.css'
const DEBUG = process.env.NODE_ENV === 'development'

// Load all default remote destination states based on constants
const configStates = []
Object.entries(c.configDescriptions).forEach(([config, description]) => {
  configStates[config] = []
})

class App extends React.Component {
  // Initialize state
  state = {
    // begin chonky file browser
    fileList: [],
    folderChain: [],
    currentFolder: '',
    currentConfigContainer: '',
    currentConfig: '',
    currentConfigAlias: '',
    showFileBrowser: false,
    loadingFileBrowser: false, // FadeIn control for chonky file browsing modal,
    // end chonky
    loadingConfig: true, // FadeIn control for config load wait
    isSplunkCloud: false,
    ep_general: {},
    passwords: [],
    roles: [],
    users: [],
    ...configStates
  }

  constructor (props) {
    super(props)
    this.columns = getColumns()
    this.fileBrowserRef = React.createRef()
  }

  // Set state from child components/called functions
  changeState = (newValue, callerFunction) => {
    if (!callerFunction) {
      // Get the caller function stack
      const stack = new Error().stack.toString()
      // Do a regex match to get the function name (with exclusions)
      const matches = [...stack.matchAll(/at (?!changeState|commit[A-Z])((?:new )?[\w.]+)/g)]
      // Put all of the groups (1) together into a cohesive string
      callerFunction = matches.map(m => m[1]).reverse().join(' > ')
    }
    (DEBUG || this.state.ep_general?.log_level === 'DEBUG') && console.log(`Setting state from ${callerFunction}`)
    return new Promise((resolve, reject) => {
      this.setState({ ...newValue }, () => { resolve(this.state) })
    })
  }

  // Load general config and refresh all tables (which gets other configs)
  componentDidMount = () => {
    // Check to see if we are running Splunk Cloud
    getServerInfo()
      .then((serverInfo) => {
        this.changeState({ isSplunkCloud: (serverInfo.instance_type === 'cloud') }, 'getServerInfo')
        const instanceType = serverInfo.instance_type ?? 'Splunk Enterprise'
        DEBUG && console.log(`Instance type: ${instanceType}`)
      })

    getConfigStanza('ep_general', 'settings')
      .then((d) => {
        this.changeState({ ep_general: d }, 'getConfigStanza')
      })
      .catch(err => console.log(err))

    this.handleTablesRefreshWrap()
  }

  // Wrap this function to provide default arguments
  handleTablesRefreshWrap = () => {
    handleTablesRefresh(this.changeState, this.columns, this.state.isSplunkCloud)
  }

  // Refresh the columns to a non-state variable
  // When this runs in render() we don't get a loop
  refreshColumns = () => {
    this.columns = getColumns(
      this.state.users,
      this.state.roles,
      this.state.passwords,
      this.state.isSplunkCloud
    )
  }

  render () {
    DEBUG && console.log('Rendering')
    this.refreshColumns()

    return (
      <div>
        <Suspense fallback={<div>Loading...</div>}>
          {/* Initial load screen and refresh button overlay */}
          {this.state?.loadingConfig && <LoadingOverlayAppConfig />}
          {/* File browser loading overlay */}
          {this.state?.loadingFileBrowser && <LoadingOverlayFileBrowser />}
        </Suspense>
        <Tabs
          id='tabs_list' className='nav nav-tabs'
          defaultIndex={0}
        >
          <TabList className='nav nav-tabs'>
            <Tab className='nav-item' key='tab_general'><a href='#' className='toggle-tab'>General</a></Tab>
            <Tab className='nav-item' key='tab_credentials'><a href='#' className='toggle-tab'>Credentials</a></Tab>
            {Object.entries(c.configDescriptions).map(([config, description], index) => {
              return (
                <Tab className='nav-item' key={`tab_${config}`}><a href='#' className='toggle-tab'>{description}</a></Tab>
              )
            })}
          </TabList>

          {/* General Tab */}
          <TabPanel key='tabPanel_general' className='tab-pane'>
            <div className='form form-horizontal form-complex'>
              <h1 className='ep'>General Settings</h1>
              <FormControl id='general_form'>
                <InputLabel id='logging_label'>Logging Level</InputLabel>
                <Select
                  labelId='logging_label'
                  id='log_level'
                  style={{ width: '150px' }}
                  value={(this.state.ep_general?.log_level === undefined) ? '' : this.state.ep_general?.log_level}
                  onChange={(event) => {
                    updateConfigItem('ep_general', { stanza: 'settings', log_level: event.target.value })
                      .then(() => {
                        this.changeState({ ep_general: { log_level: event.target.value } }, 'General Settings tab')
                      })
                  }}
                >
                  <MenuItem key='debug' value='DEBUG'>Debug</MenuItem>
                  <MenuItem key='info' value='INFO'>Info</MenuItem>
                  <MenuItem key='warn' value='WARNING'>Warning</MenuItem>
                  <MenuItem key='error' value='ERROR'>Error</MenuItem>
                  <MenuItem key='crit' value='CRITICAL'>Critical</MenuItem>
                </Select>
              </FormControl>
            </div>
          </TabPanel>

          {/* Credentials Tab */}
          <TabPanel key='tabPanel_credentials' className='tab-pane'>
            <div className='form form-horizontal form-complex'>
              <TabDocs config='credentials' section='tabDocs' />
              <div className='panel-element-row'>
                <MaterialTable
                  components={{
                    Container: props => (
                      <div className='actionicons-2'>
                        <div {...props} />
                      </div>
                    )
                  }}
                  title={TabContents('credentials').title}
                  icons={tableStyles.icons}
                  columns={this.columns.passwords}
                  data={this.state.passwords}
                  editable={{
                    onRowAdd: newData => handleRowAdd(
                      this.changeState, 'passwords', this.state.passwords, newData),
                    onRowUpdate: (newData, oldData) => handleRowUpdate(
                      this.changeState, 'passwords', this.state.passwords, newData, oldData),
                    onRowDelete: oldData => handleRowDelete(
                      this.changeState, 'passwords', this.state.passwords, oldData)
                  }}
                  options={tableStyles.options}
                  className='actionicons-2'
                  actions={[
                    {
                      icon: tableStyles.icons.Refresh,
                      tooltip: 'Refresh',
                      isFreeAction: true,
                      onClick: (event) => this.handleTablesRefreshWrap()
                    }]}
                />
              </div>
            </div>
          </TabPanel>

          {/* All remote destination tabs */}
          {Object.entries(c.configDescriptions).map(([configName, description], index) => {
            return (
              <TabPanel key={`tabPanel_${configName}`} className='tab-pane'>
                <TabTemplate
                  key={`tabcontents_${configName}`}
                  changeState={this.changeState}
                  fileBrowserRef={this.fileBrowserRef}
                  state={this.state}
                  configName={configName}
                  configData={this.state[configName]}
                  columns={this.columns[configName]}
                  onRowUpdate={handleRowUpdate}
                  onRowAdd={handleRowAdd}
                  onRowDelete={handleRowDelete}
                  onRefresh={this.handleTablesRefreshWrap}
                />
              </TabPanel>
            )
          })}

        </Tabs>

        {/* File browser (chonky) modal */}
        <Suspense fallback={<div style={{ width: '100%', margin: '25px auto', textAlign: 'center' }}>Loading Script...</div>}>
          {this.state.showFileBrowser && (
            <FileBrowserModal
              ref={this.fileBrowserRef}
              changeState={this.changeState}
              state={this.state}
              id='file_browser'
              instanceId='ep'
              onHide={() => {
                this.changeState({
                  showFileBrowser: false,
                  fileList: [],
                  folderChain: []
                }, 'FileBrowserModal')
              }}
            />
          )}
        </Suspense>
      </div>
    )
  }
}

export default App
