import React from 'react'
// import ReactDOM from 'react-dom'
import { getUserTheme } from '@splunk/splunk-utils/themes'
import App from './App'
import { SnackbarProvider } from 'notistack'

/* ReactDOM.render(
  <SnackbarProvider>
    <App
      {...this.props.data}
      app_context={this.props.utils.getCurrentApp()}
      utils={this.props.utils}
      splunk={this.props.splunk.createService({'owner': 'nobody'})}
      splunk_components={this.props.splunk_components}
      splunk_theme={this.state.theme} />
    </SnackbarProvider>,
  document.getElementById('export_everything_setup')
);
 */

class main extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      theme: 'enterprise'
    }

    getUserTheme().then(theme => {
      this.setState({ theme })
      console.log(theme)
    })
  }

  render () {
    return (
      <SnackbarProvider>
        <App
          {...this.props.data}
          app_context={this.props.utils.getCurrentApp()}
          utils={this.props.utils}
          splunk={this.props.splunk.createService({ owner: 'nobody' })}
          splunk_components={this.props.splunk_components}
          splunk_theme={this.state.theme}
        />
      </SnackbarProvider>
    )
  }
}

export default main
