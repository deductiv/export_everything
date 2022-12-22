require.config({"paths":{"main":"/static/app/export_everything/react/main.js?v=5d3ea68b065cc1a9f6d3","react":"/static/app/export_everything/react/react.js?v=d60a3fc0a526f8cbaaed","react-dom":"/static/app/export_everything/react/react-dom.js?v=6e1deeb8a366ac724652"},"shim":{"main":{"exports":["main"]},"react":{"exports":"react"},"react-dom":{"exports":"react-dom"}}});
        require([
                "splunkjs/ready!",
                "splunkjs/mvc/simplexml/ready!",
                "splunkjs/mvc/utils",
                "main", "react", "react-dom", "backbone", "jquery"
            ], function (mvc,
                            ignored,
                            splunkjsUtils,
                            main, react, reactdom, backbone, $
            ) {
            
            let myObjects = $(".export_everything_setup").each((k, v)=>{
                reactdom.render(
                react.createElement(main.default, {
                    splunk: mvc,
                    utils: splunkjsUtils,
                    splunk_components: { backbone: backbone,  $: $, } ,
                    data: {...$(v).data()}
                    }),
                    v
                );
            });
            });
        