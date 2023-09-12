import {
  updateCredentialACL,
  getConfig,
  deleteConfigItem,
  putConfigItem,
  updateConfigItem
} from './HelpersSplunk'
import { restToRows } from './Helpers'
import { getColumns } from './TableColumns'

// UUID for stanza name generation
import uuid from 'react-native-uuid'

const $ = window.jQuery

// If 'Default' attribute is set, unset it for all other entries in the configuration
export function unsetDefaultEntry (configFile, configData, newData) {
  return new Promise((resolve, reject) => {
    let newConfigState = configData.map(entry => entry.stanza === newData.stanza ? newData : entry)

    // Only do something if the new/updated entry is set to default=true
    if (newData?.default) {
      // This should only match one entry unless it was manually edited
      const oldDefaultEntries = configData.filter(
        entry => entry.default === true && entry.stanza !== newData.stanza)
        .map(config => ({ ...config, default: false }))

      newConfigState = newConfigState.map((config) =>
        oldDefaultEntries.map(old => old.stanza).indexOf(config.stanza) > -1 // the entry was previously set to default
          ? oldDefaultEntries.find(e => e.stanza === config.stanza) // return the default=false entry
          : config
      )

      // Run the updates to unset all defaults before returning the new state
      const fn = e => updateConfigItem(configFile, e)
      const actions = oldDefaultEntries.map(fn)
      const results = Promise.all(actions)
      results
        .then(d => {
          console.log('All other defaults unset')
          resolve(newConfigState)
        })
        .catch(err => {
          reject(err)
        })
    } else {
      resolve(newConfigState)
    }
  })
}

export function getMissingFormData (configFile, newData) {
  console.log('getMissingFormData called')
  // Check for missing items, e.g. blank values
  const expectedFields = []
  const columns = getColumns()
  columns[configFile].forEach(c => {
    expectedFields.push(c.field)
  })
  console.log(`Fields enumerated for ${configFile}: ${expectedFields.join(', ')}`)
  const missingFields = []
  expectedFields.forEach(f => {
    if (!(f in newData)) {
      missingFields.push(f)
    }
  })
  if (missingFields.length > 0) {
    console.log(`Missing fields for ${configFile}: ${missingFields.join(', ')}`)
    // Get the missing field values from the table in case they were set
    missingFields.forEach(missingFieldName => {
      try {
        // dropdown value DOM path
        const v = $(`#${missingFieldName} + input`).val()
        if (v != null) {
          newData[missingFieldName] = v
          console.log(`Found missing field ${missingFieldName} = ${v}`)
        }
      } catch (error) {
        console.error(error)
      }
    })
  }
  return newData
}

// Download the data and push it into the corresponding state entry
export function handleTablesRefresh (changeState, columns, isSplunkCloud) {
  changeState({ loadingConfig: true }, 'handleTablesRefresh')
  let newState = { loadingConfig: false }

  const tableList = Object.keys(columns)
  console.log('Refreshing tables: ' + JSON.stringify(tableList))
  Promise.all(tableList.map((table) => {
    const d = handleTableRefresh(changeState, columns, table, false)
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
        isSplunkCloud
      )
      newState = { ...newState, columns: newColumns }
      changeState({ ...newState }, 'handleTablesRefresh')
      console.log('Refreshing tables complete')
    })
    .catch(err => console.log(err))
}

// Download data for an individual table and update the state
export function handleTableRefresh (changeState, columns, table, setstate = true) {
  return new Promise((resolve, reject) => {
    getConfig(table)
      .then((configEntries) => {
        const tableData = (table === 'passwords')
          ? configEntries
          : { [table]: restToRows(table, configEntries, columns[table]) }
        if (setstate) {
          changeState(tableData)
          console.log(`State set for ${table}`)
        }
        resolve(tableData)
      })
      .catch(err => reject(err))
  })
}

export function handleRowUpdateACL (res, configEntry) {
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
      updateCredentialACL(c.stanza, c.owner, c.read, c.write, 'global')
        .then(r => {
          resolve(c)
        })
        .catch(err => {
          reject(err)
        })
    } else {
      resolve(c)
    }
  })
}

// Set the state data when adding a configuration item using the table view
export async function handleRowAdd (changeState, configFile, configData, newData) {
  // console.log('New data = ' + JSON.stringify(newData))
  return new Promise((resolve, reject) => {
    newData.stanza = configFile === 'passwords'
      ? `${newData.realm ?? ''}:${newData.username}:`
      : uuid.v4()
    let newConfigState
    // If 'default' is set for this new record, unset it for any other records that might have it
    unsetDefaultEntry(configFile, configData, newData)
      .then((configState) => {
        newConfigState = configState // Copy the revised config state for editing
        newData = getMissingFormData(configFile, newData)
        newConfigState.push(newData) // Add the newData entry to newConfigState
        return newData
      })
      .then((newDataRes) => putConfigItem(configFile, newDataRes))
      .then(async (putRes) => {
        return (configFile === 'passwords') ? await handleRowUpdateACL(putRes, newData) : newData
      })
      .then((d) => {
        changeState({ [configFile]: newConfigState }, 'handleRowAdd')
        resolve(d)
      })
      .catch(err => reject(err))
  })
}

// Update the UI and state
export function handleRowUpdate (changeState, configFile, configData, updatedEntry, originalEntry = {}) {
  return new Promise((resolve, reject) => {
    let newConfigState
    // Account for values set to blank, which are not submitted automatically
    updatedEntry = getMissingFormData(configFile, updatedEntry)
    // If 'default' is set for this updated record, unset it for any other records that might have it
    unsetDefaultEntry(configFile, configData, updatedEntry)
      .then((configState) => {
        // configState contains all entries for the config e.g. this.state['ep_hec']
        newConfigState = configState
        return updateConfigItem(configFile, updatedEntry)
      })
      .then(async (res) => {
        // Also set the ACL if we updated the credential and the ACL changed
        const entryIndex = newConfigState.findIndex(e => e.stanza === updatedEntry.stanza)
        if (configFile === 'passwords') {
          updatedEntry = await handleRowUpdateACL(originalEntry, updatedEntry)
            .then((entry) => newConfigState.splice(entryIndex, entry))
            .catch((err) => { throw err })
        }
        return newConfigState
      })
      .then((newConfigState) => {
        changeState({ [configFile]: newConfigState })
        resolve(newConfigState)
      })
      .catch(err => {
        changeState({ loadingConfig: false })
        console.error(err)
        throw err
      })
  })
}

export function handleRowDelete (changeState, configFile, configData, oldData) {
  return new Promise((resolve, reject) => {
    deleteConfigItem(configFile, oldData.stanza)
      .then(() => {
        // console.log('oldData', oldData)
        const newConfig = [...configData].filter(entry => entry.stanza !== oldData.stanza)
        changeState({ [configFile]: newConfig })
        resolve()
      })
      .catch(err => {
        // toast this
        throw err
      })
  })
}
