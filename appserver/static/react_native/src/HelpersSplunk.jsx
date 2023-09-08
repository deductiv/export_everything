// import React from 'react'
import * as config from '@splunk/splunk-utils/config'
import { defaultFetchInit } from '@splunk/splunk-utils/fetch'
// import { createRESTURL } from '@splunk/splunk-utils/url'
// import { getUserTheme } from '@splunk/splunk-utils/themes'
import { dictToQuerystring } from './Helpers'

// Snackbar notifications
import { notistackOptions } from './Constants'
import { enqueueSnackbar } from 'notistack'

const app = config.app

/*
export function getUserInfo () {
  return new Promise((resolve, reject) => {
    const endpoint = '/servicesNS/-/-/server/info/server-info'
    getEndpoint(endpoint).then((d) => {
      resolve(d[0].content)
    })
  })
}
*/
/*
// https://marcusschiesser.de/2021/11/08/post-request-from-a-splunk-app/
const url = createRESTURL(
    'storage/collections/data/mycollection/key',
    { app: config.app, sharing: 'app' }
);
fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
        'X-Splunk-Form-Key': config.CSRFToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
}).then(handleResponse(200))
.then((json) => {
    // success case - do something
}, handleError('Error updating. Please try again.'))
.catch((errMsg) => {
    // error case - print `errMsg` to the user
});
*/

/*
// https://detect.fyi/play-with-splunk-sigma-rule-project-splunk-ui-toolkit-suit-dc3ea589a2fe
import React from 'react'
import * as config from '@splunk/splunk-utils/config';
import { createRESTURL } from '@splunk/splunk-utils/url';
import { handleError, handleResponse, defaultFetchInit } from '@splunk/splunk-utils/fetch';

async function getSigmaRules() {
  // Create URL for collection data retrieval
  const collectionUrl = createRESTURL(`sigma/getRuleList`);

  // Read in the collection of interest
  const fetchInit = defaultFetchInit;
  fetchInit.method = 'GET';
  const response = await fetch(collectionUrl, {
    ...fetchInit,
    headers: {
      'X-Splunk-Form-Key': config.CSRFToken,
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json',
    },
  })
    .then(handleResponse(200))
    .catch(handleError('error'))
    .catch((err) => (err instanceof Object ? 'error' : err));

  return response;
}
*/
function printError (err) {
  if (err.status) {
    return `${err.status}: ${err.error}`
  } else {
    return err.message
  }
}

export function getServerInfo () {
  return new Promise((resolve, reject) => {
    const endpoint = 'services/server/info/server-info'
    getEndpoint(endpoint)
      .then((d) => {
        resolve(d[0].content)
      })
      .catch(err => {
        toastError(`Error requesting server info:\n ${printError(err)}`)
        reject(err)
      })
  })
}

export function getConfigStanza (configFile, stanza) {
  return new Promise((resolve, reject) => {
    const endpoint = `servicesNS/-/${app}/${app}/${configFile}/${stanza}`
    getEndpoint(endpoint)
      .then(data => {
        resolve(data[0].content)
      })
      .catch(err => {
        toastError(`Error requesting ${configFile}/${stanza}:\n ${printError(err)}`)
        reject(err)
      })
  })
}

export function getConfig (configFile) {
  return new Promise((resolve, reject) => {
    if (configFile === 'passwords') {
      const passwordEndpoint = `servicesNS/-/${app}/storage/passwords`
      const roleEndpoint = 'servicesNS/-/-/authorization/roles'
      const userEndpoint = 'servicesNS/-/-/authentication/users'
      let passwords
      let roles
      getEndpoint(passwordEndpoint)
        .then((passwordsRes) => {
          passwords = passwordsRes
          return getEndpoint(roleEndpoint)
        })
        .then((rolesRes) => {
          roles = rolesRes
          return getEndpoint(userEndpoint)
        })
        .then((users) => {
          const pwList = []
          for (const password of passwords) {
            if (password.acl.app === app) {
              // Build the custom password object to match the row fields in the UI
              const c = { }
              c.stanza = password.name
              c.id = password.id
              c.username = password.content.username
              c.password = password.content.encr_password
              c.realm = password.content.realm
              c.sharing = password.acl.sharing
              c.owner = password.acl.owner
              c.read = password.acl.perms.read
              c.write = password.acl.perms.write
              c.links = password.links
              c.api_entry = password
              pwList.push(c)
            }
          }
          const passwordState = {
            passwords: pwList,
            users,
            roles
          }
          resolve(passwordState)
        })
        .catch(err => reject(err))
    } else {
      const endpoint = `servicesNS/-/${app}/${app}/${configFile}`
      getEndpoint(endpoint)
        .then(d => resolve(d))
        .catch(err => reject(err))
    }
  })
}

export function getEndpoint (endpoint) {
  return new Promise((resolve, reject) => {
    request(endpoint, 'GET', null, null)
      .then(entry => resolve(entry))
      .catch(err => {
        toastError(`Error querying ${endpoint}:\n ${printError(err)}`)
        reject(err)
      })
  })
}

export function putConfigItem (configFile, items) {
  // console.log('Config file = ' + configFile)
  return new Promise((resolve, reject) => {
    const itemsCopy = { ...items }
    let restEndpoint
    if (configFile === 'passwords') {
      // console.log('items = ' + JSON.stringify(items_copy))
      restEndpoint = `servicesNS/-/${app}/storage/passwords`
      // Rename property username to name
      itemsCopy.name = itemsCopy.username
      delete itemsCopy.username
      delete itemsCopy.owner
      delete itemsCopy.stanza
      delete itemsCopy.read
      delete itemsCopy.write
      // console.log(itemsCopy)
    } else if ('stanza' in itemsCopy) {
      restEndpoint = `servicesNS/-/${app}/${app}/${configFile}/${itemsCopy.stanza}`
    } else {
      restEndpoint = `servicesNS/-/${app}/${app}/${configFile}`
    }

    request(restEndpoint, 'POST', null, itemsCopy)
      .then(res => {
        toastSuccess('Record created successfully')
        resolve(res[0])
      })
      .catch(err => {
        toastError(`Error creating record:\n ${printError(err)}`)
        reject(err)
      })
  })
}

// Update the configuration file using the EAI REST endpoint
export function updateConfigItem (configFile, itemUpdate) {
  let item = JSON.parse(JSON.stringify(itemUpdate))
  console.log(`Updating config item ${configFile}/${item.stanza}`)
  // console.log('Item = ' + JSON.stringify(item))
  return new Promise((resolve, reject) => {
    if (item?.tableData) {
      delete item.tableData
    }
    let restEndpoint
    if (configFile === 'passwords') {
      restEndpoint = `servicesNS/-/${app}/storage/passwords/${item.stanza.replace(/(:|%3A)+$/i, '')}`
      const itemCopy = { password: item.password }
      // Move the pointer to our new object
      item = itemCopy
    } else {
      restEndpoint = `servicesNS/-/${app}/${app}/${configFile}/${item.stanza}`
    }

    request(restEndpoint, 'POST', null, item)
      .then(res => {
        toastSuccess('Update successful')
        // console.log('Update response', JSON.stringify(res[0]))
        resolve(res[0])
      })
      .catch(err => {
        toastError(`Error updating record:\n ${printError(err)}`)
        reject(err)
      })
  })
}

export function deleteConfigItem (configFile, stanza) {
  // console.log(`Deleting config ${configFile}/${stanza}`)
  return new Promise((resolve, reject) => {
    let restEndpoint
    if (configFile === 'passwords') {
      restEndpoint = `servicesNS/-/${app}/storage/passwords/${stanza.replace(/:+$/, '')}`
    } else {
      restEndpoint = `${app}/${configFile}/${stanza}`
    }
    // console.log('restEndpoint', restEndpoint)
    try {
      request(restEndpoint, 'DELETE', null, null)
        .then(data => {
          toastSuccess('Record deleted successfully')
          resolve(data)
        })
        .catch(err => {
          toastError(`Error deleting record:\n ${printError(err)}`)
          reject(err)
        })
    } catch (err) {
      // console.log('deleteConfigItem error caught')
      console.error(err)
      reject(err)
    }
  })
}

export function updateCredentialACL (username, realm, owner, read, write, sharing) {
  return new Promise((resolve, reject) => {
    // read and write must be arrays
    const acl = {
      'perms.read': read,
      'perms.write': write,
      sharing,
      owner
    }
    // console.log('acl = ' + JSON.stringify(acl))
    const restEndpoint = `services/configs/conf-passwords/credential%3A${username}/acl`
    request(restEndpoint, 'POST', null, acl)
      .then(data => {
        toastSuccess('ACL update successful')
        // console.log('ACL update successful')
        resolve(data)
      })
      .catch(err => {
        toastError(`Error updating ACL:\n ${printError(err)}`)
        reject(err)
      })
  })
}

export function request (restEndpoint, method, queryArgs, data = null) {
  return new Promise((resolve, reject) => {
    const url = `${config.splunkdPath}/${restEndpoint}`
    const defaultArgs = {
      output_mode: 'json',
      count: '0'
    }
    queryArgs = Object.assign({}, queryArgs || {}, defaultArgs)
    const queryString = '?' + dictToQuerystring(queryArgs)
    fetch(url + queryString, {
      ...defaultFetchInit,
      method,
      cache: 'no-cache',
      // credentials: 'same-origin', // include, *same-origin, omit'
      // headers: defaultFetchInit.headers,
      // referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: data ? dictToQuerystring(data) : null,
      redirect: 'follow'
    })
      .then(res => {
        if (res.ok) {
          return res.json()
        } else {
          throw new Error(JSON.stringify({
            status: res.status,
            error: res.statusText
          }))
        }
      })
      .then((data) => {
        const entry = data.entry
        // Delete unneeded properties from Splunk responses
        const defaultProps = ['links', 'api_entry', 'updated', 'removable']
        if (Array.isArray(entry)) {
          entry.forEach((list, idx) => {
            defaultProps.forEach(prop => {
              // console.log(`Deleting entry ${idx} field ${prop}`)
              delete entry[idx][prop]
            })
          })
        }
        resolve(entry)
      })
      .catch((err) => {
        let error
        try {
          error = JSON.parse(err.message)
        } catch {
          error = err
        }
        // This finally sends the error to the calling function
        reject(error)
      })
  })
}

export function toastSuccess (message) {
  enqueueSnackbar(message, notistackOptions('success'))
}

export function toastError (message) {
  enqueueSnackbar(message, notistackOptions('error'))
}
