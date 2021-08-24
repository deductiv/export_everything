require.config({"paths":{"main":"/static/app/event_push/react/main.js?v=de9c5f1d6769e56b9eee","react":"/static/app/event_push/react/react.js?v=7c8c119c30562cd08464","react-dom":"/static/app/event_push/react/react-dom.js?v=5855e10dcf9b055d03e3"},"shim":{"main":{"exports":["main"]},"react":{"exports":"react"},"react-dom":{"exports":"react-dom"}}});
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
            
            let myObjects = $(".eventpush_setup").each((k, v)=>{
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
        