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

        server.on('move', function(obj) {
            var node = renderer.getObject('player' + obj.from);
            if(node) {
                node.setPos(obj.x,
                            Terrain.getHeight(obj.x, obj.y) + 20,
                            obj.y);
            }
        });
    }

    window.serverEvents = {
        init: init
    };
})();