require.config({"paths":{"main":"/static/app/export_everything/react/main.js?v=ef7b39e159f3500457c7","react":"/static/app/export_everything/react/react.js?v=3f2c236ae439d1c15d61","react-dom":"/static/app/export_everything/react/react-dom.js?v=bbe0fe8f90f1a0844ba7"},"shim":{"main":{"exports":["main"]},"react":{"exports":"react"},"react-dom":{"exports":"react-dom"}}});
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
        