require.config({
  paths: {
    react: '/static/app/export_everything/react/react',
    'react-dom': '/static/app/export_everything/react/react-dom'
  }
});

require([
    "splunkjs/ready!",
    "splunkjs/mvc/simplexml/ready!",
    "splunkjs/mvc/utils",
    "backbone",
    "jquery",
    "react",
    "react-dom",
    "/static/app/export_everything/react/main.js"
  ], function (
    mvc,
    ignored,
    splunkjsUtils,
    backbone,
    $,
    React,
    ReactDOM,
    main
  ) {
    const el = document.getElementById("root")
    const root = ReactDOM.createRoot(el)
    root.render(
      React.createElement(main.default, {
        splunk: mvc,
        utils: splunkjsUtils,
        splunk_components: { backbone, $ },
        data: {...$(el).data()}
      })
    )
    // console.log('Loaded React app')
  }
)