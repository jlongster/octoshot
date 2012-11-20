
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
var root;

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

    var camera = new sh.Camera([200, 200, -500]);
    renderer.setRoot(camera);

    root = new sh.SceneNode();
    camera.addObject(root);

    for(var i=0; i<1000; i++) {
        var cube = new sh.Cube([Math.random() * 500 - 250,
                                Math.random() * 500 - 250,
                                Math.random() * 500 - 250],
                               [Math.random() * Math.PI * 2,
                                Math.random() * Math.PI * 2,
                                0],
                              [15, 15, 15]);
        cube.setMaterial(sh.Shaders.getProgram('default'));
        root.addObject(cube);
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
    //gl.enable(gl.CULL_FACE);
    heartbeat();
}

var last = Date.now();
function heartbeat() {
    var now = Date.now();
    var dt = (now - last) / 1000.;

	var time = Date.now() * 0.001;

	var rx = Math.sin(time * 0.7) * 0.5;
	var ry = Math.sin(time * 0.3) * 0.5;
	var rz = Math.sin(time * 0.2) * 0.5;

    root.setRot(rx, ry, rz);
    renderer.update(dt);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    renderer.render();

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

    resources.onReady(init);
});
