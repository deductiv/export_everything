import React from 'react'
import Modal from 'react-bootstrap/Modal'
import { setChonkyDefaults, FileBrowser, FileNavbar, FileToolbar, FileList, ChonkyActions } from 'chonky'
import { ChonkyIconFA } from 'chonky-icon-fontawesome'

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
