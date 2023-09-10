import React from 'react'
import { getUserTheme } from '@splunk/splunk-utils/themes'
import App from './App'
// import { SnackbarProvider } from 'notistack'
import ToastMessages from '@splunk/react-toast-notifications/ToastMessages'
import { SplunkThemeProvider, mixins, variables /* pick */ } from '@splunk/themes'
import styled, { createGlobalStyle } from 'styled-components'
import layout from '@splunk/react-page'
// import withSplunkTheme from '@splunk/themes/withSplunkTheme'

// const baseTheme = getTheme({family: 'prisma', colorScheme: 'light', density: 'compact' });

const GlobalStyles = createGlobalStyle`
  body {
      background-color: ${variables.backgroundColorPage};
  }
`

const StyledContainer = styled.div`
    ${mixins.reset('inline')};
    display: block;
    font-size: ${variables.fontSizeLarge};
    line-height: 200%;
    margin: ${variables.spacing};
`

class main extends React.Component {
  /* componentDidMount = () => {
    this.setState({ theme: 'enterprise' })

      this.setState({ theme })
      console.log(theme)
    })
  } */

  // <SplunkThemeProvider> family="enterprise" colorScheme="dark" density="comfortable">
  render () {
    return (
      getUserTheme().then(theme => {
        layout(
          <SplunkThemeProvider>
            <GlobalStyles />
            <StyledContainer>
              <App
                {...this.props.data}
                app_context={this.props.utils.getCurrentApp()}
                utils={this.props.utils}
                splunk={this.props.splunk.createService({ owner: 'nobody' })}
                splunk_components={this.props.splunk_components}
                splunk_theme={this.state?.theme}
              />
              <ToastMessages position='top-center' />
            </StyledContainer>
          </SplunkThemeProvider>,
          {
            theme
          }
        )
      })
    )
  }
}

export default main
