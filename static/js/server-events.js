(function() {
    function init() {
        server.on('join', function(obj) {
            var ent = new Entity({ pos: [obj.x, obj.y, obj.z],
                                   rot: [obj.rotX, obj.rotY, obj.rotZ] });
            ent.id = 'anon' + obj.id;
            renderer.addObject(ent);
        });

        server.on('leave', function(obj) {
            var node = renderer.getObject('anon' + obj.id);
            if(node) {
                node._parent.removeObject(node);
            }
        });

        server.on('state', function(obj) {
            var node;
            if(obj.from !== 0) {
                node = renderer.getObject('anon' + obj.from);
            }
            else {
                node = renderer.getCamera().target;
            }

            if(node) {
                node.applyState(obj);
            }
        });

        server.on('cmd', function(obj) {
            switch(obj.method) {
            case 'die':
                var node;
                if(obj.from !== 0) {
                    notify(obj.args[1] + ' was killed by ' + obj.args[0]);
                    node = renderer.getObject('anon' + obj.from);
                }
                else {
                    notify('You were killed by ' + obj.args[0]);
                    node = renderer.getCamera().target;
                }

                if(node) {
                    node.restart();
                }
            }
        });
    }

    window.serverEvents = {
        init: init
    };
})();