(function(Cube, Square) {

    function createLevel(scene) {
        // for(var i=1; i<10; i++) {
        //     var cube = new Cube([20, 0, i*70],
        //                         [0, 0, 0],
        //                         [100, 100, 10]);
        //     cube.id = 'cube' + i;
        //     scene.addObject(cube);
        // }
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
          require('./node-shade').Square] :
         [sh.Cube, sh.Square]);