import React from 'react';
import App from './App';
import { SnackbarProvider } from 'notistack';

class main extends React.Component {

    constructor(props) {
        super(props);
    }

    render() {
        return (
            <SnackbarProvider>
                <App 
                    {...this.props.data}
                    app_context={this.props.utils.getCurrentApp()}
                    utils={this.props.utils}
                    splunk={this.props.splunk.createService({"owner": "nobody"})}
                    splunk_components={this.props.splunk_components}/>
            </SnackbarProvider>
        );
    }
}

export default main;
