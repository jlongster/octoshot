(function() {
    function init() {
        server.on('join', function(obj) {
            var cube = new sh.Cube([0, 50, 0],
                                   null,
                                   [10, 10, 10],
                                   { centered: true });
            cube.id = 'player' + obj.id;
            renderer.addObject(cube);
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
                node = renderer.getCamera();
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