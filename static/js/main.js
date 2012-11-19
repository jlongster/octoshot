
var requestAnimFrame = (function(){
    return window.requestAnimationFrame       ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function(callback){
            window.setTimeout(callback, 1000 / 60);
        };
})();

var resources = new sh.Resources();
var stats;
var w = window.innerWidth;
var h = window.innerHeight;
var renderer;
var gl;
var camera;
var server = new Server();

var canvas = document.getElementById('canvas');
canvas.width = w;
canvas.height = h;

var DEFAULT_ATTRIB_ARRAYS = [
  { name: "a_position",
    size: 3,
    stride: 8,
    offset: 0,
    decodeOffset: -4095,
    decodeScale: 1/8191
  },
  { name: "a_texcoord",
    size: 2,
    stride: 8,
    offset: 3,
    decodeOffset: 0,
    decodeScale: 1/1023
  },
  { name: "a_normal",
    size: 3,
    stride: 8,
    offset: 3,
    decodeOffset: -511,
    decodeScale: 1/1023
  }
];

function convertToWireframe(indices) {
    var arr = new Uint16Array(indices.length / 3 * 6);
    var idx = 0;

    for(var i=0; i<indices.length; i+=3) {
        arr[idx++] = indices[i];
        arr[idx++] = indices[i+1];
        arr[idx++] = indices[i+1];
        arr[idx++] = indices[i+2];
        arr[idx++] = indices[i+2];
        arr[idx++] = indices[i];
    }

    return arr;
}

var Player = sh.SceneNode.extend({});

function init() {
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    renderer = new sh.Renderer();

    camera = new sh.Camera([0, 0, 0]);
    renderer.setRoot(camera);

    var sceneX = 256;
    var sceneY = 256;

    var terrain = new Terrain(null, null, null, sceneX, sceneY);
    terrain.create();
    camera.addObject(terrain);

    var player = new Player();
    camera.addObject(player);

    for(var x=0; x<sceneX; x+=sceneX/10) {
        for(var y=0; y<sceneY; y+=sceneY/10) {
            var cube = new sh.Cube([x, 100, y],
                                null,
                                [20, 20, 20],
                                { centered: true,
                                  });
            cube.setMaterial(sh.Shaders.getProgram('default'));
            camera.addObject(cube);

            var circ = cube.addObject(new sh.SceneNode({
                rot: [Math.random() * Math.PI, 0, 0],
                update: function(dt) {
                    this.rotateY(Math.PI / 2.0 * dt);
                }
            }));

            for(var i=0; i<Math.PI*2; i+=Math.PI/2) {
                var c = new sh.Cube([Math.sin(i), 0, Math.cos(i)],
                                    null,
                                    [.5, .5, .5],
                                    { centered: true });
                c.setMaterial(sh.Shaders.getProgram('default'));
                circ.addObject(c);
            }
        }
    }

    var pers = mat4.create();
    mat4.perspective(45, w / h, 1.0, 5000.0, pers);

    sh.Shaders.iterPrograms(function(program) {
        gl.useProgram(program);
        var persLoc = gl.getUniformLocation(program, "pers");
        gl.uniformMatrix4fv(persLoc, false, pers);
    });

    document.getElementById('loading').style.display = 'none';

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    heartbeat();
}

var last = Date.now();
function heartbeat() {
    var now = Date.now();
    var dt = (now - last) / 1000.;

	var time = Date.now() * 0.001;
	var rx = Math.sin( time * 0.7 ) * 0.2;
	var ry = Math.sin( time * 0.3 ) * 0.1;
	var rz = Math.sin( time * 0.2 ) * 0.1;

    renderer.update(dt);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    renderer.render();

    if(camera.moved) {
        server.sendMove(camera.pos[0], camera.pos[2]);
    }

    last = now;
    requestAnimFrame(heartbeat);

    stats.update();
}

window.addEventListener('load', function() {
    stats = new Stats();
    //stats.setMode(1);
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.right = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);

    resources.load('resources/ben.mesh', DEFAULT_ATTRIB_ARRAYS);
    resources.load('resources/teapot.mesh', DEFAULT_ATTRIB_ARRAYS);
    resources.load('resources/grass.jpg');
    resources.onReady(init);
});
