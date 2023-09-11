import React from 'react'
import Modal from 'react-bootstrap/Modal'
import { setChonkyDefaults, FileBrowser, FileNavbar, FileToolbar, FileList, ChonkyActions } from 'chonky'
import { ChonkyIconFA } from 'chonky-icon-fontawesome'
import { request } from './HelpersSplunk'
import c from './Constants'
// File browser UI

/*

Props list:

show
onHide
location
instanceId
fileList
folderChain
onFileAction

*/

setChonkyDefaults({ iconComponent: ChonkyIconFA })
ChonkyActions.ToggleHiddenFiles.option.defaultValue = false

export function FileBrowserModal (props) {
  const location = `${c.configDescriptions[props.state.currentConfig]} / ${props.state.currentConfigAlias}`

  function handleFileAction (data) {
    if (!data?.payload?.targetFile || !data.payload?.targetFile?.isDir) return
    const newPrefix = `${data.payload.targetFile.id.replace(/\/*$/, '')}/`
    handleShowFolderContents(
      props.changeState,
      props.state.currentConfig,
      props.state.currentConfigAlias,
      props.state.currentConfigContainer,
      newPrefix,
      props.state.folderChain,
      props.state.fileList
    )
  }

  return (
    <Modal
      // size='lg'
      id='ep_file_browser_modal'
      show={props.state.showFileBrowser}
      onHide={props.onHide}
      dialogClassName='primaryModal'
      aria-labelledby='file_browser'
      centered
      className='modal-wide in'
      style={{ height: '60%', resize: 'vertical' }}
    >
      <Modal.Header closeButton>
        <Modal.Title id='file_browser'>
          Browse Location: {location}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body
        style={{ height: '100%' }}
      >
        <FileBrowser
          instanceId={props.instanceId}
          files={props.state.fileList}
          folderChain={props.state.folderChain}
          fillParentContainer
          onFileAction={handleFileAction}
          defaultFileViewActionId={ChonkyActions.EnableListView.id}
          disableDragAndDrop
          disableDragAndDropProvider
          disableSelection
          disableDefaultFileActions={[
            ChonkyActions.OpenSelection.id,
            ChonkyActions.SelectAllFiles.id,
            ChonkyActions.ClearSelection.id,
            ChonkyActions.EnableCompactView.id,
            ChonkyActions.EnableGridView.id
          ]}
        >
          <FileNavbar />
          <FileToolbar />
          <FileList />
        </FileBrowser>
      </Modal.Body>
    </Modal>
  )
}

function buildFolderChain (configName, configAlias, containerName, folder, oldChain, oldFiles) {
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
  oldChain && console.log('oldChain = ' + JSON.stringify(oldChain))

  if (folder !== undefined && folder !== null && folder.length > 0) {
    let chainPath = ''
    if (folder.match(/^[0-9]+\/$/)) {
      // Treat the folder like an ID
      chain = []
      folder = folder.replace('/', '')
      // Is this ID already in the previously used chain? User opted to go backwards
      if (oldChain.length > 0) {
        for (const chainEntry of oldChain) {
          chain.push(chainEntry)
          // Break if the just-added ID is the folder specified
          if (chainEntry.id === folder) {
            break
          }
        }
        if (oldChain.length === chain.length) {
          console.log('oldChain and chain are the same length', JSON.stringify(oldChain), JSON.stringify(chain))
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
        }
      }
    } else {
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
        }
      }
    }
  } else if ((folder == null || folder.length === 0) && containerName !== '/') {
    // Append the root file (folder) object - container_name = share, bucket, /, etc.
    chain.push({
      id: ('/' + containerName + '/').replace('//', '/'),
      name: containerName,
      isDir: true
    })
  }
  return chain
}

// Set the state data when adding a configuration item using the table view
export function handleShowFolderContents (changeState, configName, configAlias, containerName, folder, oldChain, oldFiles) {
  return new Promise((resolve, reject) => {
    // Showing folder data
    // const oldChain = [...this.state.folder_chain]
    // const oldFiles = [...this.state.file_list]
    let fileList
    let folderChain
    containerName = (containerName == null || containerName.length === 0) ? '/' : containerName

    console.log('Setting state from handleShowFolderContents')
    const url = 'servicesNS/-/export_everything/export_everything_dirlist'

    changeState({
      loadingFileBrowser: true,
      showFileBrowser: true,
      currentConfig: configName,
      currentConfigAlias: configAlias,
      currentConfigContainer: containerName
    })
      .then(() => { folderChain = buildFolderChain(configName, configAlias, containerName, folder, oldChain, oldFiles) })
      .then(() => {
        console.log('Querying REST endpoint for directory contents')
        const requestFolder = folderChain[folderChain.length - 1].id ?? '/'
        const params = {
          config: configName,
          alias: configAlias,
          folder: requestFolder
        }
        return request(url, 'GET', params)
      })
      .then((response) => {
        if (Array.isArray(response) && response.length > 0) {
          // Different format of response from Splunk. Get the data from within the object.
          if ('content' in response[0] && Array.isArray(response[0].content)) {
            fileList = JSON.parse(response[0].content[0].payload)
          } else {
            changeState({ loadingFileBrowser: false, showFileBrowser: false })
            throw new Error(response)
          }
        } else {
          console.error(response)
          throw new Error('Error retrieving the file listing: Malformed response')
        }

        if (fileList) {
          // console.log('File list = ' + JSON.stringify(fileList))
          for (let f = 0; f < fileList.length; f++) {
            if (fileList[f].modDate !== undefined) {
              if (Number(fileList[f].modDate) !== 0) {
                const utcSeconds = Number(fileList[f].modDate)
                const printedDate = new Date(0) // Sets the date to epoch
                printedDate.setUTCSeconds(utcSeconds)
                // Firefox only works with the ISO string
                fileList[f].modDate = printedDate.toISOString()
              } else {
                delete fileList[f].modDate
              }
            }
          }
          console.log('Setting state from handleShowFolderContents')
          changeState({
            fileList,
            folderChain,
            loadingFileBrowser: false
          })
          // console.log('File list = ' + JSON.stringify(fileList))
          resolve(fileList)
        }
      })
      .catch((err) => {
        changeState({ loadingFileBrowser: false, showFileBrowser: false })
        console.error(err)
        if (err?.status && err?.responseText) {
          window.alert(`${err.status} Error retrieving the file listing: \n${err.responseText}`)
        } else {
          window.alert(`Error retrieving the file listing: ${JSON.stringify(err.message)}`)
        }
        throw err
      })
  })
}
