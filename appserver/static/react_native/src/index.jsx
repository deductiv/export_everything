import React from 'react'
import { getUserTheme } from '@splunk/splunk-utils/themes'
import App from './App'
import { SnackbarProvider } from 'notistack'

class main extends React.Component {
  componentDidMount = () => {
    this.setState({ theme: 'enterprise' })

    getUserTheme().then(theme => {
      this.setState({ theme })
      console.log(theme)
    })
    /*
    console.log('utils', this.props.utils)
    console.log('app_context', this.props.utils.getCurrentApp())
    console.log('splunk', this.props.splunk.createService({ owner: 'nobody' }))
    console.log('splunk_components', this.props.splunk_components)
    */
  }

  render () {
    // console.log('Render routine')
    return (
      <SnackbarProvider>
        <App
          {...this.props.data}
          app_context={this.props.utils.getCurrentApp()}
          utils={this.props.utils}
          splunk={this.props.splunk.createService({ owner: 'nobody' })}
          splunk_components={this.props.splunk_components}
          splunk_theme={this.state?.theme}
        />
      </SnackbarProvider>
    )
  }
}

export default main
