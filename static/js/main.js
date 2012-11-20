
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
var server;

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

    var pers = mat4.create();
    mat4.perspective(45, w / h, 1.0, 5000.0, pers);

    sh.Shaders.iterPrograms(function(program) {
        gl.useProgram(program);
        var persLoc = gl.getUniformLocation(program, "pers");
        gl.uniformMatrix4fv(persLoc, false, pers);
    });

    document.getElementById('loading').style.display = 'none';

    initServer();
    initMessages();

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    heartbeat();
}

function initServer() {
    server = new Server();

    server.on('newUser', function(obj) {
        var el = $('#notification');
        el.text('Your username: ' + obj.name)
            .addClass('open');

        setTimeout(function() {
            el.removeClass('open');
        }, 1000);
    });

    server.on('join', function(obj) {
        console.log('joined: ' + obj.id);

        var cube = new sh.Cube([0, 50, 0],
                               null,
                               [10, 10, 10],
                               { centered: true });
        cube.id = 'player' + obj.id;
        cube.setMaterial(sh.Shaders.getProgram('default'));
        camera.addObject(cube);
    });

    server.on('leave', function(obj) {
        var node = renderer.getObject('player' + obj.id);
        if(node) {
            node._parent.removeObject(node);
        }
    });

    server.on('move', function(obj) {
        console.log('move: ' + obj);
        var node = renderer.getObject('player' + obj.from);
        if(node) {
            node.setPos(obj.x, Terrain.getHeight(obj.x, obj.y) + 20, obj.y);
        }
    });
}

var last = Date.now();
function heartbeat() {
    var now = Date.now();
    var dt = (now - last) / 1000.;

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

$(function() {
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
