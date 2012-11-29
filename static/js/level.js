(function(Cube) {

    function createLevel(scene) {
        for(var i=0; i<5; i++) {
            var cube = new Cube([-20, 0, i*70],
                                [0, 0, 0],
                                [100, 100, 20]);
            cube.id = 'cube' + i;
            console.log(cube.AABB.extent);
            scene.addObject(cube);
        }
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