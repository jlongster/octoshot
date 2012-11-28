
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
var server;
var player;

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

function notify(msg) {
    var n = $('#notification');
    n.text(msg);
    n.addClass('open');

    setTimeout(function() {
        n.removeClass('open');
    }, 1000);
}

function init() {
    renderer = new sh.Renderer(w, h, 255 * 4, 255 * 4);
    server = new ServerConnection();

    player = new Player();
    renderer.setCamera(new sh.Camera(player));
    renderer.perspective(45, w / h, 1.0, 5000.0);

    var terrain = new Terrain(null, null, null,
                              renderer.sceneWidth,
                              renderer.sceneDepth);
    terrain.create();
    renderer.addObject(terrain);

    for(var i=0; i<50; i++) {
        var cube = new sh.Cube([50, 0, i*25],
                               [0, 0, 0],
                               [100, 100, 10]);
        renderer.addObject(cube);
    }
    
    document.getElementById('loading').style.display = 'none';

    serverEvents.init();
    messages.init();

    heartbeat();

    notify("Press T to bring up chat, ESC to close it");
}

var last = Date.now();
function heartbeat() {
    var now = Date.now();
    var dt = Math.min((now - last) / 1000., .1);

    renderer.update(dt);
    //checkCollisions();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    renderer.render();

    last = now;
    requestAnimFrame(heartbeat);

    input.reset();
    stats.update();
}

$(function() {
    stats = new Stats();
    //stats.setMode(1);
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.right = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);

    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    // resources.load('resources/ben.mesh', DEFAULT_ATTRIB_ARRAYS);
    // resources.load('resources/teapot.mesh', DEFAULT_ATTRIB_ARRAYS);
    resources.load([
        'shaders/default.fsh',
        'shaders/default.vsh',
        'shaders/debug.fsh',
        'shaders/debug.vsh',
        'shaders/terrain.fsh',
        'shaders/terrain.vsh',
        'img/grass.jpg'
    ]);
    resources.onReady(init);
})
