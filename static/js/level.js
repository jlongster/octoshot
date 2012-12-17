(function(Cube, Square, Collision) {

    function createLevel(scene) {
        var w = scene.sceneWidth;
        var d = scene.sceneDepth;
        var height = 300;
        var thickness = 1000;
        var opts = { wireframe: false };

        // var floor = new Cube([0, -50, 0],
        //                      null,
        //                      [w, 50, d],
        //                     opts);
        // floor.color = [.2, .2, .2];
        // floor.collisionType = Collision.STATIC;
        // scene.addObject(floor);

        var front = new Cube([-thickness, 0, -thickness],
                             null,
                             [w + thickness * 2, height, thickness],
                            opts);
        front.color = [.2, .2, .2];
        front.collisionType = Collision.STATIC;
        scene.addObject(front);

        var back = new Cube([-thickness, 0, d],
                            null,
                            [w + thickness * 2, height, thickness],
                           opts);
        back.color = [.2, .2, .2];
        back.collisionType = Collision.STATIC;
        scene.addObject(back);

        var right = new Cube([-thickness, 0, 0], null, [thickness, height, d],
                            opts);
        right.color = [.2, .2, .2];
        right.collisionType = Collision.STATIC;
        scene.addObject(right);

        var left = new Cube([w, 0, 0], null, [thickness, height, d],
                           opts);
        left.color = [.2, .2, .2];
        left.collisionType = Collision.STATIC;
        scene.addObject(left);

        var wall1 = new Cube([250, 0, 250], null, [200, height, 30]);
        wall1.collisionType = Collision.STATIC;
        wall1.color = [.22, .39, .23];
        scene.addObject(wall1);

        var wall2 = new Cube([250 - 30, 0, 250], null, [30, height, 200]);
        wall2.collisionType = Collision.STATIC;
        wall2.color = [.39, .22, .23];
        scene.addObject(wall2);

        var wall3 = new Cube([500, 0, 600], null, [200, height, 30]);
        wall3.collisionType = Collision.STATIC;
        wall3.color = [.22, .39, .23];
        scene.addObject(wall3);

        var wall4 = new Cube([700, 0, 600], null, [30, height, 200]);
        wall4.collisionType = Collision.STATIC;
        wall4.color = [.39, .22, .23];
        scene.addObject(wall4);
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

        var halfX = 16 * 3 / 2.0;
        var health = new sh.SceneNode([renderer.width / 2  - halfX,
                                       renderer.height - 40,
                                       0], 
                                      null,
                                     [32, 32, 1]);
        scene.add2dObject(health);

        var heart = new Square([-1, 0, 0]);
        heart.id = 'heart0';
        heart.setMaterial(['ui.vsh', 'ui.fsh']);
        heart.setImage('img/heart.png');
        health.addObject(heart);

        heart = new Square([0, 0, 0])
        heart.id = 'heart1';
        heart.setMaterial(['ui.vsh', 'ui.fsh']);
        heart.setImage('img/heart.png');
        health.addObject(heart);

        heart = new Square([1, 0, 0])
        heart.id = 'heart2';
        heart.setMaterial(['ui.vsh', 'ui.fsh']);
        heart.setImage('img/heart.png');
        health.addObject(heart);

        renderer.onResize(function() {
            s.setPos(renderer.width / 2 - 17,
                     renderer.height / 2 - 16,
                     0);

            health.setPos(renderer.width / 2,
                          renderer.height - 40,
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