import React from 'react'
import Modal from 'react-bootstrap/Modal'
import { setChonkyDefaults, FileBrowser, FileNavbar, FileToolbar, FileList, ChonkyActions } from 'chonky'
import { ChonkyIconFA } from 'chonky-icon-fontawesome'
import { getEndpoint } from './HelpersSplunk'
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
  return (
    <Modal
      // size='lg'
      id='ep_file_browser_modal'
      show={props.show}
      onHide={props.onHide}
      dialogClassName='primaryModal'
      aria-labelledby='file_browser'
      centered
      className='modal-wide in'
      style={{ height: '60%', resize: 'vertical' }}
    >
      <Modal.Header closeButton>
        <Modal.Title id='file_browser'>
          Browse Location: {props.location}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body
        style={{ height: '100%' }}
      >
        <FileBrowser
          instanceId={props.instanceId}
          files={props.fileList}
          folderChain={props.folderChain}
          fillParentContainer
          onFileAction={props.onFileAction}
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

// Set the state data when adding a configuration item using the table view
export function handleShowFolderContents (changeState, configFile, alias, containerName, folder, oldChain, oldFiles) {
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
    changeState({
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

      getEndpoint(url, params)
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
              changeState({ loadingFileBrowser: false, showFileBrowser: false })
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
            changeState({
              fileList,
              folderChain: chain,
              loadingFileBrowser: false
            })
            // console.log('File list = ' + JSON.stringify(fileList))
            resolve(fileList)
          }
        }, reason => {
          window.alert(`${reason.status} Error retrieving the file listing: \n${reason.responseText}`)
          changeState({ loadingFileBrowser: false, showFileBrowser: false })
          reject(reason)
        })
    }
    )
    resolve()
  })
}

export function handleFileAction (state, changeState, data) {
  if (!data?.payload?.targetFile || !data.payload?.targetFile?.isDir) return
  const newPrefix = `${data.payload.targetFile.id.replace(/\/*$/, '')}/`
  handleShowFolderContents(
    changeState,
    state.currentConfig,
    state.currentConfigAlias,
    state.currentConfigContainer,
    newPrefix
  )
}
