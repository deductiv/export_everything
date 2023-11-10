import React, { forwardRef } from 'react'

// Icons
import Search from '@material-ui/icons/Search'
import FirstPage from '@material-ui/icons/FirstPage'
import LastPage from '@material-ui/icons/LastPage'
import ChevronRight from '@material-ui/icons/ChevronRight'
import ChevronLeft from '@material-ui/icons/ChevronLeft'
import Clear from '@material-ui/icons/Clear'
import ArrowDownward from '@material-ui/icons/ArrowDownward'
import Info from '@material-ui/icons/Info'
import Check from '@material-ui/icons/Check'
import Delete from '@material-ui/icons/Delete'
import Edit from '@material-ui/icons/Edit'
import Add from '@material-ui/icons/Add'
import Remove from '@material-ui/icons/Remove'
import SaveAlt from '@material-ui/icons/SaveAlt'
import FolderIcon from '@material-ui/icons/Folder'
import RefreshIcon from '@material-ui/icons/Refresh'

const headerStyles = {
  width: '100%',
  whiteSpace: 'pre-wrap'
}

const tableStyles = {
  headerStyles,
  cellStyles: {
    wordBreak: 'break-all',
    padding: '0 3px'
  },

  centerHeaderStyles: {
    width: '100%',
    textAlign: 'center'
  },

  centerCellStyles: {
    textAlign: 'center',
    paddingRight: '26px'
  },

  icons: {
    Search: forwardRef((props, ref) => <Search {...props} ref={ref} />),
    FirstPage: forwardRef((props, ref) => <FirstPage {...props} ref={ref} />),
    LastPage: forwardRef((props, ref) => <LastPage {...props} ref={ref} />),
    NextPage: forwardRef((props, ref) => <ChevronRight {...props} ref={ref} />),
    PreviousPage: forwardRef((props, ref) => <ChevronLeft {...props} ref={ref} />),
    Clear: forwardRef((props, ref) => <Clear {...props} ref={ref} />),
    ResetSearch: forwardRef((props, ref) => <Clear {...props} ref={ref} />),
    SortArrow: forwardRef((props, ref) => <ArrowDownward {...props} ref={ref} />),
    Info: forwardRef((props, ref) => <Info {...props} ref={ref} />),
    DetailPanel: forwardRef((props, ref) => <Info {...props} ref={ref} />),
    Check: forwardRef((props, ref) => <Check {...props} ref={ref} />),
    Delete: forwardRef((props, ref) => <Delete {...props} ref={ref} />),
    Edit: forwardRef((props, ref) => <Edit {...props} ref={ref} />),
    Add: forwardRef((props, ref) => <Add {...props} ref={ref} />),
    ThirdStateCheck: forwardRef((props, ref) => <Remove {...props} ref={ref} />),
    Export: forwardRef((props, ref) => <SaveAlt {...props} ref={ref} />),
    Open: forwardRef((props, ref) => <FolderIcon {...props} ref={ref} />),
    Refresh: forwardRef((props, ref) => <RefreshIcon {...props} ref={ref} />)
  },

  options: {
    grouping: false,
    search: false,
    exportButton: false,
    toolbar: true,
    paging: false,
    draggable: false,
    rowStyle: {
      padding: '0',
      fontSize: '12px',
      wordBreak: 'break-all'
    },
    headerStyles,
    actionsColumnIndex: -1,
    actionsCellStyle: {
      padding: '0',
      justifyContent: 'center'
    },
    idSynonym: 'stanza' /* ,
    actionsHeaderStyle: {
      textAlign: 'center'
    } */
  }
}

export default tableStyles
