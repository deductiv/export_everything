import React from 'react'
import MaterialTable from '@material-table/core'
import tableStyles from './TableStyles'
import { TabContents, TabDocs } from './TabContents'
import { handleBrowse } from './FileBrowserModal'
/*

Props list:

title
heading
actionColumns (count)
browsable (bool)
config

columns
config
configData

*/

export function TabTemplate (props) {
  const configName = props.configName
  const tabContents = TabContents(configName)
  const browsable = tabContents.browsable ?? false
  const actionColumns = browsable ? 3 : 2

  return (
    <div className='form form-horizontal form-complex'>
      <h1 className='ep'> {tabContents.title}</h1>
      <div style={{ width: '700px', paddingBottom: '15px' }}>
        <TabDocs config={configName} />
      </div>

      <div className='panel-element-row'>
        <MaterialTable
          components={{
            Container: props => (
              <div className={`actionicons-${actionColumns}`}>
                <div {...props} />
              </div>
            )
          }}
          title={
            <div className='form form-complex'>
              <h2 className='ep'> {tabContents.heading}</h2>
            </div>
          }
          icons={tableStyles.icons}
          columns={props.columns}
          data={props.configData}
          editable={{
            onRowAdd: newData => props.onRowAdd(
              props.changeState, configName, props.configData, newData),
            onRowUpdate: (newData, oldData) => props.onRowUpdate(
              props.changeState, configName, props.configData, newData, oldData),
            onRowDelete: oldData => props.onRowDelete(
              props.changeState, configName, props.configData, oldData)
          }}
          actions={(
            [
              browsable && {
                icon: tableStyles.icons.Open,
                tooltip: 'Browse',
                onClick: (event, rowData) => {
                  // FileBrowserModal.jsx/handleBrowse
                  props.changeState({
                    loadingFileBrowser: true
                  }, 'Row browse icon click handler')
                  handleBrowse(props.changeState, props.configName, rowData, props.fileBrowserRef)
                }
              },
              {
                icon: tableStyles.icons.Refresh,
                tooltip: 'Refresh',
                isFreeAction: true,
                onClick: (event) => props.onRefresh()
              }
            ].filter(icon => icon.icon)
          )}
          options={tableStyles.options}
          className={`actionicons-${actionColumns}`}
        />
      </div>
    </div>
  )
}
