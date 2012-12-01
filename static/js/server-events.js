(function() {
    function getTargettedEntity(obj) {
        var node;
        if(obj.from !== 0) {
            node = scene.getObject('anon' + obj.from);
        }
        else {
            node = scene.getCamera().target;
        }
        return node;
    }

    function init() {
        server.on('join', function(obj) {
            var ent = new Entity({
                pos: [obj.x, obj.y, obj.z],
                rot: [obj.rotX, obj.rotY, obj.rotZ],
                color: [Math.random(), Math.random(), Math.random()]
            });
            ent.id = 'anon' + obj.id;
            scene.addObject(ent);
        });

        server.on('leave', function(obj) {
            var node = scene.getObject('anon' + obj.id);
            if(node) {
                node._parent.removeObject(node);
            }
        });

        server.on('newUser', function(obj) {
            if(obj.playerCount <= 1) {
                messages.notify('Waiting for other players...');
            }
        });

        server.on('gameStart', function(obj) {
            game.start(obj.started);
        });

        server.on('gameOver', function(obj) {
            game.end(obj);
        });

        server.on('state', function(obj) {
            var node;
            if(obj.from !== 0) {
                node = scene.getObject('anon' + obj.from);
            }
            else {
                node = scene.getCamera().target;
            }

            if(node) {
                node.applyState(obj);
            }
        });

        server.on('cmd', function(obj) {
            switch(obj.method) {
            case 'die':
                if(obj.from !== 0) {
                    messages.notify(obj.args[1] + ' was killed by ' + obj.args[0]);
                }
                else {
                    messages.notify('You were killed by ' + obj.args[0]);
                }

                var node = getTargettedEntity(obj);
                if(node) {
                    node.restart(obj.args[2]);
                }
                break;
            case 'hit':
                var node = getTargettedEntity(obj);
                if(node) {
                    node.hit();
                }
                break;
            case 'fullRoom':
                game.setFull(obj.args[0]);
                break;
            case 'shoot':
                resources.get('sounds/laser.wav').play(.2);
            }
        });
    }

    window.serverEvents = {
        init: init
    };
})();