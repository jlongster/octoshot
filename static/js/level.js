(function(Cube) {

    function createLevel(scene) {
        for(var i=1; i<10; i++) {
            var cube = new Cube([20, 0, i*70],
                                [0, 0, 0],
                                [100, 100, 10]);
            cube.id = 'cube' + i;
            scene.addObject(cube);
        }

        // var fakePlayer = new Entity({ pos: [0, 0, 200] });
        // fakePlayer.id = 'fakePlayer';
        // scene.addObject(fakePlayer);
    }

    if(typeof module !== 'undefined') {
        module.exports = {
            createLevel: createLevel
        };
    }
    else {
        window.createLevel = createLevel;
    }

}).apply(this, typeof module !== 'undefined' ?
         [require('./node-shade').Cube] :
         [sh.Cube]);