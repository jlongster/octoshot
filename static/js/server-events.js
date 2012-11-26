(function() {
    function init() {
        server.on('join', function(obj) {
            var ent = new Entity({ pos: [obj.x, obj.y, obj.z],
                                   rot: [obj.rotX, obj.rotY, obj.rotZ] });
            ent.addObject(new sh.Cube(null,
                                      null,
                                      [10, 10, 10],
                                      { centered: true }));
            ent.id = 'player' + obj.id;
            renderer.addObject(ent);
        });

        server.on('leave', function(obj) {
            var node = renderer.getObject('player' + obj.id);
            if(node) {
                node._parent.removeObject(node);
            }
        });

        server.on('state', function(obj) {
            var node;
            if(obj.from !== 0) {
                node = renderer.getObject('player' + obj.from);
            }
            else {
                node = renderer.getCamera().target;
            }

            if(node) {
                node.applyState(obj);
            }
        });
    }

    window.serverEvents = {
        init: init
    };
})();