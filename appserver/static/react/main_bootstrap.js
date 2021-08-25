require.config({"paths":{"main":"/static/app/export_everything/react/main.js?v=5e0a94ed387b3398877d","react":"/static/app/export_everything/react/react.js?v=426016a7540e482d11de","react-dom":"/static/app/export_everything/react/react-dom.js?v=978c8f443977e7cee269"},"shim":{"main":{"exports":["main"]},"react":{"exports":"react"},"react-dom":{"exports":"react-dom"}}});
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
        