(function(Cube, Square, Collision) {

    function createLevel(scene) {
        // for(var i=1; i<10; i++) {
        //     var cube = new Cube([20, 0, i*70],
        //                         [0, 0, 0],
        //                         [100, 100, 10]);
        //     cube.id = 'cube' + i;
        //     scene.addObject(cube);
        // }

        var w = scene.sceneWidth;
        var d = scene.sceneDepth;
        var height = 300;
        var thickness = 1000;
        var opts = { wireframe: false };

        var front = new Cube([-thickness, 0, -thickness],
                             null,
                             [w + thickness * 2, height, thickness],
                            opts);
        front.collisionType = Collision.STATIC;
        front.color = [.25, .35, .25];
        scene.addObject(front);

        var back = new Cube([-thickness, 0, d],
                            null,
                            [w + thickness * 2, height, thickness],
                           opts);
        back.collisionType = Collision.STATIC;
        scene.addObject(back);

        var right = new Cube([-thickness, 0, 0], null, [thickness, height, d],
                            opts);
        right.collisionType = Collision.STATIC;
        scene.addObject(right);

        var left = new Cube([w, 0, 0], null, [thickness, height, d],
                           opts);
        left.collisionType = Collision.STATIC;
        scene.addObject(left);
    }

    function createOverlay(scene) {
        // Shift it over 1 more on the x because the texture doesn't
        // have a perfect center
        var s = new Square([renderer.width / 2 - 17,
                            renderer.height / 2 - 16,
                            0],
                           null,
                           [32, 32, 1]);
        s.setMaterial(['ui.vsh', 'ui.fsh']);
        s.setImage('img/crosshair.png');
        scene.add2dObject(s);

        renderer.onResize(function() {
            s.setPos(renderer.width / 2 - 17,
                     renderer.height / 2 - 16,
                     0);
        });
    }

    if(typeof module !== 'undefined') {
        module.exports = {
            createLevel: createLevel
        };
    }
    else {
        window.createLevel = createLevel;
        window.createOverlay = createOverlay;
    }

}).apply(this, typeof module !== 'undefined' ?
         [require('./node-shade').Cube,
          require('./node-shade').Square,
          require('./node-shade').Collision] :
         [sh.Cube, sh.Square, sh.Collision]);