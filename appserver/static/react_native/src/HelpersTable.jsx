import {
  // getServerInfo, getConfigStanza, getConfig, updateCredentialACL,
  // putConfigItem,
  updateConfigItem
} from './HelpersSplunk'
import { getColumns } from './TableColumns'

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

export function getMissingFormData ($, configFile, newData) {
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
