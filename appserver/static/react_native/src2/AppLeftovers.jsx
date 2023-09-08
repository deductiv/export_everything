updateParentState = (prop) => {
  this.setState(Object.assign(this.state, prop))
}

// Convert an object to an HTTP query string (for Splunk configuration POST requests)
dict_to_querystring = (d) => {
  const queryList = []
  const itemList = Object.entries(d)
  for (const item of itemList) {
    const name = item[0]
    const val = encodeURIComponent(item[1])
    queryList.push(name + '=' + val)
  }
  // console.log('Query list: ' + query_list.toString())
  // Join list with & for query string
  return queryList.join('&')
}

// Convert REST API responses to a list of objects that translate to table rows
rest_to_rows = (configFile, d) => {
  const rows = []
  // Get the names of fields from the columns definition
  const validFields = this.list_table_fields(this.columns[configFile])
  // console.log(`Valid fields for ${configFile}: ${JSON.stringify(valid_fields)}`)
  for (const restEntry of d) {
    const row = restEntry.content
    row.stanza = restEntry.name
    for (const key of Object.keys(row)) {
      // Sanitize the output from the API to only include our defined columns
      if (!validFields.includes(key)) {
        delete row[key]
      } else {
        // Find boolean fields and convert the values from strings
        for (const field of this.columns[configFile]) {
          if (field.field === key && field.type === 'boolean') {
            row[key] = booleanize(row[key])
          }
        }
      }
    }
    rows.push(row)
  }
  return rows
}

list_table_fields = (l) => {
  // l = List of dicts passed
  const fields = []

  for (const d of l) {
    fields.push(d.field)
  }
  return fields
}

update_credential_acl = (username, realm, owner, read, write, sharing) => {
  return new Promise((resolve, reject) => {
    // read and write must be arrays
    const acl = {
      'perms.read': read,
      'perms.write': write,
      sharing,
      owner
    }
    // console.log('New ACL = ' + JSON.stringify(acl))
    const restEndpoint = `configs/conf-passwords/credential%3A${username}/acl`
    this.props.splunk.request(restEndpoint,
      'POST',
      { output_mode: 'json' },
      null,
      this.dict_to_querystring(acl),
      { 'Content-Type': 'application/x-www-form-urlencoded' },
      (err, response) => {
        if (err == null) {
          enqueueSnackbar('ACL update successful', notistackOptions('success'))
          resolve(response.data)
        } else {
          enqueueSnackbar(`Error updating ACL:\n ${err.status}: ${err.error}`, notistackOptions('error'))
          this.setState({ loadingConfig: false })
          reject(err)
        }
      }
    )
  })
}

get_user_info = () => {
  return new Promise((resolve, reject) => {
    const endpoint = '/servicesNS/-/-/server/info/server-info'
    this.get_endpoint(endpoint).then((d) => {
      resolve(d[0].content)
    })
  })
}

get_server_info = () => {
  return new Promise((resolve, reject) => {
    const endpoint = '/servicesNS/-/-/server/info/server-info'
    this.get_endpoint(endpoint).then((d) => {
      resolve(d[0].content)
    })
  })
}

get_config_stanza = (configFile, stanza) => {
  return new Promise((resolve, reject) => {
    this.props.splunk.get(`${app}/${configFile}/${stanza}`).then((d) => {
      const clear = JSON.parse(d)
      // resolve(clear)
      resolve(clear.entry[0].content)
    })
  })
}

get_config = (configFile) => {
  return new Promise((resolve, reject) => {
    if (configFile === 'passwords') {
      const passwordEndpoint = `/servicesNS/-/${app}/storage/passwords`
      this.get_endpoint(passwordEndpoint).then((passwords) => {
        const roleEndpoint = '/servicesNS/-/-/authorization/roles'
        this.get_endpoint(roleEndpoint).then((roles) => {
          const userEndpoint = '/servicesNS/-/-/authentication/users'
          this.get_endpoint(userEndpoint).then((users) => {
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
        })
      })
    } else {
      const endpoint = `/servicesNS/-/${app}/${app}/${configFile}`
      resolve(this.get_endpoint(endpoint))
    }
  })
}

get_endpoint = (endpoint) => {
  return new Promise((resolve, reject) => {
    const params = {
      output_mode: 'json',
      count: '0'
    }
    this.props.splunk.request(endpoint,
      'GET',
      params,
      null,
      null,
      { 'Content-Type': 'application/x-www-form-urlencoded' },
      (err, response) => {
        if (err == null) {
          resolve(response.data.entry)
        } else {
          enqueueSnackbar(`Error querying ${endpoint}:\n ${err.status}: ${err.error}`, notistackOptions('error'))
          reject(err)
        }
      }
    )
  })
}

put_config_item = (configFile, items) => {
  // console.log('Config file = ' + configFile)
  return new Promise((resolve, reject) => {
    const itemsCopy = { ...items }
    let restEndpoint
    if (configFile === 'passwords') {
      // console.log('items = ' + JSON.stringify(items_copy))
      restEndpoint = `/servicesNS/-/${app}/storage/passwords`
      // Rename property username to name
      itemsCopy.name = itemsCopy.username
      delete itemsCopy.username
      delete itemsCopy.owner
      delete itemsCopy.stanza
      delete itemsCopy.read
      delete itemsCopy.write
      // console.log(itemsCopy)
    } else if ('stanza' in itemsCopy) {
      restEndpoint = `${app}/${configFile}/${itemsCopy.stanza}`
    } else {
      restEndpoint = `${app}/${configFile}`
    }

    this.props.splunk.request(restEndpoint,
      'POST',
      { output_mode: 'json' },
      null,
      this.dict_to_querystring(itemsCopy),
      { 'Content-Type': 'application/x-www-form-urlencoded' },
      (err, response) => {
        if (err == null) {
          enqueueSnackbar('Record created successfully', notistackOptions('success'))
          resolve(response.data)
        } else {
          enqueueSnackbar(`Error creating record:\n ${err.status}: ${err.error}`, notistackOptions('error'))
          reject(err)
        }
      }
    )
  })
}

// Update the configuration file using the EAI REST endpoint
update_config_item = (configFile, itemUpdate) => {
  let item = JSON.parse(JSON.stringify(itemUpdate))
  // console.log('Item = ' + JSON.stringify(item))
  return new Promise((resolve, reject) => {
    if (item?.tableData) {
      delete item.tableData
    }
    let restEndpoint
    if (configFile === 'passwords') {
      restEndpoint = `/servicesNS/-/${app}/storage/passwords/${item.stanza.replace(/(:|%3A)+$/i, '')}`
      const itemCopy = { password: item.password }
      // Move the pointer to our new object
      item = itemCopy
    } else {
      restEndpoint = `${app}/${configFile}/${item.stanza}`
    }

    this.props.splunk.request(restEndpoint,
      'POST',
      { output_mode: 'json' },
      null,
      this.dict_to_querystring(item),
      { 'Content-Type': 'application/x-www-form-urlencoded' },
      (err, response) => {
        if (err == null) {
          enqueueSnackbar('Update successful', notistackOptions('success'))
          resolve(response.data)
        } else {
          enqueueSnackbar(`Error updating record:\n ${err.status}: ${err.error}`, notistackOptions('error'))
          reject(err)
        }
      }
    )
  })
}

delete_config_item = (configFile, stanza) => {
  console.log(`Deleting config ${configFile}/${stanza}`)
  return new Promise((resolve, reject) => {
    let restEndpoint
    if (configFile === 'passwords') {
      restEndpoint = `/servicesNS/-/${app}/storage/passwords/${stanza.replace(/:+$/, '')}`
    } else {
      restEndpoint = `${app}/${configFile}/${stanza}`
    }

    this.props.splunk.request(restEndpoint,
      'DELETE',
      { output_mode: 'json' },
      null,
      null,
      { 'Content-Type': 'application/x-www-form-urlencoded' },
      (err, response) => {
        if (err == null) {
          enqueueSnackbar('Record deleted successfully', notistackOptions('success'))
          resolve(response.data)
        } else {
          enqueueSnackbar(`Error deleting record:\n ${err.status}: ${err.error}`, notistackOptions('error'))
          reject(err)
        }
      }
    )
  })
}

// Set the state data when adding a configuration item using the table view
show_folder_contents = (configFile, alias, containerName, folder) => {
  return new Promise((resolve, reject) => {
    // Showing folder data
    const oldChain = [...this.state.folderChain]
    const oldFiles = [...this.state.fileList]
    console.log('Old chain = ' + JSON.stringify(oldChain))
    // console.log('Old files = ' + JSON.stringify(oldFiles))
    let fileList

    if (containerName === undefined || containerName === null || containerName.length === 0) {
      containerName = '/'
    }

    console.log('Setting state from show_folder_contents')
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
      console.log('Container Name = ' + containerName)
      console.log('Folder = ' + folder)

      if (folder !== undefined && folder !== null && folder.length > 0) {
        params.folder = folder
        let chainPath = ''
        if (folder.match(/^[0-9]+\/$/)) {
          // Treat the folder like an ID
          chain = []
          folder = folder.replace('/', '')
          console.log('Using folder argument as ID')
          // Is this ID already in the previously used chain? User opted to go backwards
          console.log('Old chain: ' + JSON.stringify(oldChain))
          if (oldChain.length > 0) {
            for (const chainEntry of oldChain) {
              chain.push(chainEntry)
              // Break if the just-added ID is the folder specified
              if (chainEntry.id === folder) {
                break
              }
            }
            console.log('New chain 1: ' + JSON.stringify(chain))
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
              console.log('New chain 2: ' + JSON.stringify(chain))
            }
          }
        } else {
          console.log('Using folder argument as path')
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
              console.log('f = ' + f)
            }
          }
        }
      } else if ((folder === undefined || folder === null || folder.length === 0) && containerName !== '/') {
        console.log('Showing root')
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
            console.log('Setting state from show_folder_contents')
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

EPTabContent = (props) => {
  const title = props.title || ''
  const heading = props.heading || ''
  const actionColumns = props.actionColumns || '2'
  const browsable = booleanize(props.browsable || 'false')
  const config = props.config

  return (
      <div className='form form-horizontal form-complex'>
        <h1 className='ep'> {title}</h1>
        {(props.children != null && props.children.length > 0) && (
          <div style={{ width: '700px', paddingBottom: '15px' }}>
            {props.children}
          </div>
        )}

        <div className='panel-element-row'>
          <MaterialTable
            components={{
              Container: props => (
                <div className={'actionicons-' + actionColumns}>
                  <div {...props} />
                </div>
              )
            }}
            title={
              <div className='form form-complex'>
                <h2 className='ep'> {heading}</h2>
              </div>
            }
            icons={tableStyles.icons}
            columns={this.columns[config]}
            data={this.state[config]}
            editable={{
              onRowAdd: newData => this.add_row_data(config, newData),
              onRowUpdate: (newData, oldData) => this.update_row_data(config, newData, oldData),
              onRowDelete: oldData => this.delete_row_data(config, oldData)
            }}
            actions={(
              [
                browsable && {
                  icon: tableStyles.icons.Open,
                  tooltip: 'Browse',
                  onClick: (event, rowData) => {
                    this.show_folder_contents(
                      config,
                      rowData.alias,
                      rowData.share_name ||
                        rowData.default_s3_bucket ||
                        rowData.default_container,
                      rowData.default_folder
                    )
                  }
                },
                {
                  icon: tableStyles.icons.Refresh,
                  tooltip: 'Refresh',
                  isFreeAction: true,
                  onClick: (event) => this.refresh_tables()
                }
              ]
            )}
            options={tableStyles.options}
            className={'actionicons-' + actionColumns}
          />
        </div>
      </div>
  )
}
