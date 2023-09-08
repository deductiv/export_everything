import React, { Suspense } from 'react'
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs'
import { FormControl, Select, InputLabel, MenuItem } from '@material-ui/core'
import MaterialTable from '@material-table/core'
// import { rootPath, username, app } from '@splunk/splunk-utils/config'
// import { ThemeProvider, createTheme /* , makeStyles */ } from '@material-ui/core/styles'
// import Chip from '@splunk/react-ui/Chip'

// UUID for stanza name generation
import uuid from 'react-native-uuid'
import tableStyles from './TableStyles'
import { TabTemplate } from './TabTemplate'
import { restToRows } from './Helpers'
import { LoadingOverlayAppConfig, LoadingOverlayFileBrowser } from './Overlays'
import {
  getServerInfo, getConfigStanza, getConfig, updateCredentialACL,
  putConfigItem, deleteConfigItem, updateConfigItem
} from './HelpersSplunk'
import { unsetDefaultEntry, getMissingFormData } from './HelpersTable'
import { getColumns } from './TableColumns'
import { TabContents, TabDocs } from './TabContents'
import { FileBrowserModal } from './FileBrowserModal'
import c from './Constants'

// Stylesheets
import 'react-tabs/style/react-tabs.css'

// Lazy load controls for the file browser UI
// const { FileBrowserModal } = React.lazy(() => import('./FileBrowserModal'))

// Material-UI v5 migration
// const theme = createTheme()

/* const useStyles = makeStyles((theme) => {
  root: {
    // some CSS that accesses the theme
  }
}) */

class App extends React.Component {
  state = {
    // begin chonky file browser
    fileList: [],
    folderChain: [], //
    currentFolder: '', //
    currentConfigContainer: '', //
    currentConfig: '', //
    currentConfigAlias: '',
    showFileBrowser: false,
    loadingFileBrowser: false, // FadeIn control for chonky file browsing modal,
    // end chonky
    loadingConfig: true, // FadeIn control for config load wait
    isSplunkCloud: false,
    ep_general: {},
    // table lists
    ep_hec: [],
    ep_aws: [],
    ep_box: [],
    ep_sftp: [],
    ep_smb: [],
    passwords: [],
    roles: [],
    users: []
  }

  constructor (props) {
    super(props)

    this.columns = getColumns()
    // Check to see if we are running Splunk Cloud
    getServerInfo().then((serverInfo) => {
      this.isSplunkCloud = (serverInfo.instance_type === 'cloud')
      const instanceType = serverInfo.instance_type != null ? serverInfo.instance_type : 'Splunk Enterprise'
      console.log(`Instance type: ${instanceType}`)
    })
    // console.log('User: ', JSON.stringify(this.props.splunk.currentUser()))
  }

  componentDidMount = () => {
    getConfigStanza('ep_general', 'settings')
      .then((d) => {
        this.setState({ ep_general: d })
      })
      .catch(err => console.log(err))

    this.handleTablesRefresh()
  }

  refreshColumns = () => {
    this.columns = getColumns(
      this.state.users,
      this.state.roles,
      this.state.passwords,
      this.state.isSplunkCloud
    )
  }

  // Download the data and push it into the corresponding state entry
  handleTablesRefresh = () => {
    this.setState({ loadingConfig: true })
    let newState = { loadingConfig: false }

    const tables = Object.keys(this.columns)
    console.log('Refreshing tables: ' + JSON.stringify(tables))
    Promise.all(tables.map((table) => {
      const d = this.handleTableRefresh(table, false)
      return d
    }))
      .then((tableData) => {
        // Convert array of single-item dicts to one dict
        // Passwords a 3-item dict
        tableData?.forEach((tableDict) => {
          if (tableDict != null) {
            for (const [key, value] of Object.entries(tableDict)) {
              newState[key] = value
            }
          }
        })
        const newColumns = getColumns(
          newState.users,
          newState.roles,
          newState.passwords,
          this.state.isSplunkCloud
        )
        newState = { ...newState, columns: newColumns }
        this.setState(prevState => ({ ...prevState, ...newState }))
        console.log('Refreshing tables complete')
      })
      .catch(err => console.log(err))
  }

  // Download data for an individual table and update the state
  handleTableRefresh = (table, setstate = true) => {
    return new Promise((resolve, reject) => {
      getConfig(table)
        .then((configEntries) => {
          const tableData = (table === 'passwords')
            ? configEntries
            : { [table]: restToRows(table, configEntries, this.columns[table]) }
          /* if (table === 'passwords') {
            tableData = configEntries
          } else {
            // Convert the REST response data into a usable row format
            tableData = { [table]: restToRows(table, configEntries, this.columns[table]) }
          } */
          if (setstate) {
            this.setState(tableData)
            console.log(`State set for ${table}`)
          }
          resolve(tableData)
        })
        .catch(err => reject(err))
    })
  }

  handleRowUpdateACL = (res, configEntry) => {
    return new Promise((resolve, reject) => {
      // Build the custom password object to match the row fields in the UI
      // This comes in two formats (addRow/updateRow)
      res = res.api_entry ?? res
      const c = {
        stanza: res.name,
        id: res.id,
        username: res.content.username,
        password: res.content.encr_password,
        realm: res.content.realm,
        sharing: 'global',
        app: res.acl.app,
        // links: res.links,
        // api_entry: res,
        // Material-UI refuses to pass these values into newData,
        owner: configEntry.owner,
        read: (Array.isArray(configEntry.read)
          ? configEntry.read
          : configEntry.read.split(',')).filter((role) => role !== ''),
        write: (Array.isArray(configEntry.write)
          ? configEntry.write
          : configEntry.write.split(',')).filter((role) => role !== '')
      }

      // Update the ACL to what was supplied
      // Check to see if it is different from default
      if (c.owner !== res.acl.owner ||
        JSON.stringify(c.read) !== JSON.stringify(res.acl.perms.read) ||
        JSON.stringify(c.write) !== JSON.stringify(res.acl.perms.write)) {
        // (username, stanza, owner, read, write, sharing)
        updateCredentialACL(c.stanza, c.realm, c.owner, c.read, c.write, 'global')
          .then(r => {
            resolve(c)
          })
          .catch(err => {
            console.log('Setting state from handleRowAdd (updateCredentialACL error)', err)
            this.setState({ loadingConfig: false })
            reject(err)
          })
      } else {
        resolve(c)
      }
    })
  }

  // Set the state data when adding a configuration item using the table view
  handleRowAdd = async (configFile, newData) => {
    // console.log('New data = ' + JSON.stringify(newData))
    return new Promise((resolve, reject) => {
      if (configFile !== 'passwords') {
        newData.stanza = uuid.v4()
      }
      let newConfigState
      // const dataNew = [...this.state[configFile]]
      // If 'default' is set for this new record, unset it for any other records that might have it
      unsetDefaultEntry(configFile, this.state[configFile], newData)
        .then((configState) => {
          newData = getMissingFormData(this.props.splunk_components.$, configFile, newData)
          newConfigState = configState // Copy the revised config state for editing
          newConfigState.push(newData) // Add the newData entry to newConfigState
          return newData
        })
        .then((newDataRes) => putConfigItem(configFile, newDataRes))
        .then(async (putRes) => {
          // Item has been committed to the config and the response is res
          return (configFile === 'passwords') ? await this.handleRowUpdateACL(putRes, newData) : newData
        })
        .then((d) => {
          // dataNew.push(d)
          console.log('Setting state from handleRowAdd')
          this.setState({ [configFile]: newConfigState })
          // this.handleTableRefresh(configFile)
          resolve(d)
        })
        .catch(err => reject(err))
    })
  }

  // Update the UI and state
  handleRowUpdate = (configFile, updatedEntry, originalEntry = {}) => {
    return new Promise((resolve, reject) => {
      // Account for values set to blank, which are not submitted automatically
      // console.log(JSON.stringify(updatedEntry))
      let newConfigState
      updatedEntry = getMissingFormData(this.props.splunk_components.$, configFile, updatedEntry)
      // console.log('updatedEntry', updatedEntry)
      // If 'default' is set for this updated record, unset it for any other records that might have it
      unsetDefaultEntry(configFile, this.state[configFile], updatedEntry)
        .then((configState) => {
          // configState contains all entries for the config e.g. this.state['ep_hec']
          newConfigState = configState
          return updateConfigItem(configFile, updatedEntry)
        })
        .then(async (res) => {
          // Also set the ACL if we updated the credential and the ACL changed
          const entryIndex = newConfigState.findIndex(e => e.stanza === updatedEntry.stanza)
          if (configFile === 'passwords') {
            updatedEntry = await this.handleRowUpdateACL(originalEntry, updatedEntry)
              .then((entry) => newConfigState.splice(entryIndex, entry))
          }
          return newConfigState
        })
        .then((newConfigState) => {
          this.setState({ [configFile]: newConfigState })
          resolve(newConfigState)
        })
        .catch(err => reject(err))
    })
  }

  handleRowDelete = (configFile, oldData) => {
    return new Promise((resolve, reject) => {
      deleteConfigItem(configFile, oldData.stanza)
        .then(() => {
          // console.log('oldData', oldData)
          const newConfig = [...this.state[configFile]].filter(entry => entry.stanza !== oldData.stanza)
          this.setState({ [configFile]: newConfig })
          resolve()
        })
        .catch(err => {
          // toast this
          throw err
        })
    })
  }

  // Set the state data when adding a configuration item using the table view
  handleShowFolderContents = (configFile, alias, containerName, folder, oldChain, oldFiles) => {
    return new Promise((resolve, reject) => {
      // Showing folder data
      // const oldChain = [...this.state.folderChain]
      // const oldFiles = [...this.state.fileList]
      console.log('Old chain = ' + JSON.stringify(oldChain))
      // console.log('Old files = ' + JSON.stringify(oldFiles))
      let fileList

      if (containerName === undefined || containerName === null || containerName.length === 0) {
        containerName = '/'
      }

      console.log('Setting state from handleShowFolderContents')
      this.setState({
        loadingFileBrowser: true,
        showFileBrowser: true,
        currentConfig: configFile,
        currentConfigAlias: alias,
        currentConfigContainer: containerName
      }, () => { // then
        const url = 'export_everything_dirlist'
        const params = {
          config: configFile,
          alias
        }

        // Start with the root - /
        let chain = [{
          id: '/',
          name: '/',
          isDir: true
        }]

        // If the query folder is blank, use the default container name in the chain
        // else, use what's in the folder setting only
        containerName && console.log('Container Name = ' + containerName)
        folder && console.log('Folder = ' + folder)

        if (folder !== undefined && folder !== null && folder.length > 0) {
          params.folder = folder
          let chainPath = ''
          if (folder.match(/^[0-9]+\/$/)) {
            // Treat the folder like an ID
            chain = []
            folder = folder.replace('/', '')
            // console.log('Using folder argument as ID')
            // Is this ID already in the previously used chain? User opted to go backwards
            // console.log('Old chain: ' + JSON.stringify(oldChain))
            if (oldChain.length > 0) {
              for (const chainEntry of oldChain) {
                chain.push(chainEntry)
                // Break if the just-added ID is the folder specified
                if (chainEntry.id === folder) {
                  break
                }
              }
              // console.log('New chain 1: ' + JSON.stringify(chain))
              if (oldChain.length === chain.length) {
                // We made it through our old chain without finding the selection
                // Must have been selected from the list shown
                // Get the object from the file list and append it to the folder chain
                for (const oldFile of oldFiles) {
                  console.log(folder + ' / ' + oldFile.id)
                  if (oldFile.id === folder) {
                    chain.push(oldFile)
                    break
                  }
                }
                // console.log('New chain 2: ' + JSON.stringify(chain))
              }
            }
          } else {
            // console.log('Using folder argument as path')
            // Treat the folder argument like a path
            // Strip / from beginning and end
            for (const f of folder.replace(/^\/+|\/+$/, '').replace(/\\+/g, '/').replace(/\/+/g, '/').split('/')) {
              if (f.length > 0) {
                chainPath = chainPath + '/' + f
                chain.push({
                  id: chainPath,
                  name: f,
                  isDir: true
                })
                // console.log('f = ' + f)
              }
            }
          }
        } else if ((folder === undefined || folder === null || folder.length === 0) && containerName !== '/') {
          // Append the root file (folder) object - container_name = share, bucket, /, etc.
          chain.push({
            id: containerName, // '/',
            name: containerName,
            isDir: true
          })
        }

        console.log('Querying REST endpoint for directory contents')

        this.props.splunk.get(url, params)
          .then((d) => {
            console.log('Query complete')
            const response = JSON.parse(d)
            // console.log(response)
            if ('entry' in response) {
              // console.log('entry found')
              // Different format of response from Splunk. Get the data from within the object.
              if ('content' in response.entry[0] && Array.isArray(response.entry[0].content)) {
                fileList = JSON.parse(response.entry[0].content[0].payload)
              } else {
                // Error
                console.log('Error retrieving the file listing')
                const responseData = { }
                // Convert the response to a dict
                for (const e of response.entry) {
                  responseData[e.title] = e.content
                }
                window.alert(`${responseData.status} Error retrieving the file listing: \n${responseData.error}`)
                this.setState({ loadingFileBrowser: false, showFileBrowser: false })
                reject(responseData)
              }
            } else {
              fileList = response
            }

            if (fileList != null) {
              if ('entry' in fileList) {
                // Different format of response from Splunk. Get the data from within the object.
                fileList = JSON.parse(fileList.entry[0].content[0].payload)
              }
              // console.log('File list = ' + JSON.stringify(fileList))
              for (let f = 0; f < fileList.length; f++) {
                if (fileList[f].modDate !== undefined) {
                  if (Number(fileList[f].modDate) !== 0) {
                    const utcSeconds = Number(fileList[f].modDate)
                    const printedDate = new Date(0) // Sets the date to epoch
                    printedDate.setUTCSeconds(utcSeconds)
                    // const printedDate = moment.unix(Number(fileList[f].modDate))
                    // Firefox only works with the ISO string
                    fileList[f].modDate = printedDate.toISOString()
                  } else {
                    delete fileList[f].modDate
                  }
                }
                // console.log(fileList[f])
              }
              console.log('Setting state from handleShowFolderContents')
              this.setState({
                fileList,
                folderChain: chain,
                loadingFileBrowser: false
              })
              // console.log('File list = ' + JSON.stringify(fileList))
              resolve(fileList)
            }
          }, reason => {
            window.alert(`${reason.status} Error retrieving the file listing: \n${reason.responseText}`)
            this.setState({ loadingFileBrowser: false, showFileBrowser: false })
            reject(reason)
          })
      }
      )
      resolve()
    })
  }

  handleFileAction = (data) => {
    if (!data?.payload?.targetFile || !data.payload?.targetFile?.isDir) return
    const newPrefix = `${data.payload.targetFile.id.replace(/\/*$/, '')}/`
    this.handleShowFolderContents(
      this.state.currentConfig,
      this.state.currentConfigAlias,
      this.state.currentConfigContainer,
      newPrefix
    )
  }

  render () {
    // const self = this
    console.log('Rendering')
    this.refreshColumns()

    return (
      <div>
        <Suspense fallback={<div>Loading...</div>}>
          {this.state?.loadingConfig && <LoadingOverlayAppConfig />}
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
                    updateConfigItem(
                      'ep_general',
                      {
                        stanza: 'settings',
                        log_level: event.target.value
                      }
                    )
                    console.log('Setting state from General Settings tab')
                    this.setState({ ep_general: { log_level: event.target.value } })
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
                    onRowAdd: newData => this.handleRowAdd('passwords', newData),
                    onRowUpdate: (newData, oldData) => this.handleRowUpdate('passwords', newData, oldData),
                    onRowDelete: oldData => this.handleRowDelete('passwords', oldData)
                  }}
                  options={tableStyles.options}
                  className='actionicons-2'
                  actions={[
                    {
                      icon: tableStyles.icons.Refresh,
                      tooltip: 'Refresh',
                      isFreeAction: true,
                      onClick: (event) => this.handleTablesRefresh()
                    }]}
                />
              </div>
            </div>
          </TabPanel>

          {/* All remote destination tabs */}
          {Object.entries(c.configDescriptions).map(([config, description], index) => {
            return (
              <TabPanel key={`tabPanel_${config}`} className='tab-pane'>
                <TabTemplate
                  key={`tabcontents_${config}`}
                  config={config}
                  configData={this.state[config]}
                  columns={this.columns[config]}
                  onRowUpdate={this.handleRowUpdate}
                  onRowAdd={this.handleRowAdd}
                  onRowDelete={this.handleRowDelete}
                  onRefresh={this.handleTablesRefresh}
                  onBrowse={this.handleShowFolderContents}
                />
              </TabPanel>
            )
          })}

        </Tabs>

        <Suspense fallback={<div style={{ width: '100%', margin: '25px auto', textAlign: 'center' }}>Loading Script...</div>}>
          {this.state.showFileBrowser && (
            <FileBrowserModal
              id='file_browser'
              instanceId='ep'
              show={this.state.showFileBrowser}
              onHide={() => {
                console.log('Setting state from FileBrowserModal')
                this.setState({
                  showFileBrowser: false,
                  fileList: [],
                  folderChain: []
                })
              }}
              location={`${c.configDescriptions[this.state.currentConfig]} / ${this.state.currentConfigAlias}`}
              fileList={this.state.fileList}
              folderChain={this.state.folderChain}
              onFileAction={this.handleFileAction}
            />
          )}
        </Suspense>
      </div>
    )
  }
}

export default App
