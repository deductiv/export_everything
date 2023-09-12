import React from 'react'
import App from './App'
import { SnackbarProvider } from 'notistack'

class main extends React.Component {
  render () {
    return (
      <SnackbarProvider>
        <App />
      </SnackbarProvider>
    )
  }
}

export default main
