
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
var scene;
var gl;
var server;
var player;
var game;

var canvas = document.getElementById('canvas');
canvas.width = w;
canvas.height = h;

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

function showInitialOverlay() {
    if(document.cookie.indexOf('seenOverlay') === -1) {
        document.cookie = 'seenOverlay=1;expires=0';
        $('#ingame .initialOverlay').show();
    }
    else {
        actuallyStart();
    }
}

function actuallyStart() {
    var el = $('#ingame')[0];
    $('.initialOverlay', el).hide();

    input.activate();
    messages.notify('Press F1 to toggle the chat window. ' +
                    'You can change your name there.');
}

function init() {
    renderer = new sh.Renderer(w, h);
    scene = new sh.Scene(255 * 4, 255 * 4);
    game = new Game();

    var room = window.location.pathname.slice(1);
    server = new ServerConnection(room);

    createLevel(scene);
    createOverlay(scene);

    player = new Player();
    scene.addObject(player);
    scene.setCamera(new sh.Camera(player));
    renderer.perspective(45, w / h, 1.0, 5000.0);

    var sky = new sh.Cube(null,
                          null,
                          [50, 50, 50],
                         { centered: true });
    sky.update = function(dt) {
        this.setPos(player.pos[0], player.pos[1], player.pos[2]);
    };
    sky.id = 'sky';
    sky.backface = true;
    sky.noZbuffer = true;
    sky.setMaterial(['sky.vsh', 'sky.fsh']);
    scene.addObject(sky);

    //var fork = new sh.Square([200, 100, 200], null, [20, 20, 20]);
    // fork.setImage('img/fork.png');
    // forka.setMaterial(['ui.vsh', 'ui.fsh']);
    // fork.color = [0, 1, 0];
    // fork.backface = true;
    // scene.addObject(fork);

    var terrain = new Terrain(null, null, null,
                              scene.sceneWidth,
                              scene.sceneDepth);
    terrain.create();
    scene.addObject(terrain);

    serverEvents.init();
    messages.init();
    window.onresize = resize;

    if(!game.isFull()) {
        showInitialOverlay();
        heartbeat();
    }
}

var last = Date.now();
var stopped = false;
function heartbeat() {
    var now = Date.now();
    var dt = Math.min((now - last) / 1000., .1);

    scene.update(dt);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    renderer.render(scene);
    renderer.render2d(scene.getOverlay());

    input.reset();

    if(stats) {
        stats.update();
    }

    if(!stopped) {
        last = now;
        requestAnimFrame(heartbeat);
    }
}

function resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;

    canvas.width = w;
    canvas.height = h;

    // !@$#!@$#$$!@#!
    gl.viewport(0, 0, canvas.width, canvas.height);

    renderer.resize(w, h);
    renderer.perspective(45, w / h, 1.0, 5000.0);

    $('#messages').height(renderer.height - $('#chat .type').height());
}

function load() {
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    // stats = new Stats();
    // //stats.setMode(1);
    // stats.domElement.style.position = 'absolute';
    // stats.domElement.style.right = '0px';
    // stats.domElement.style.top = '0px';
    // document.body.appendChild(stats.domElement);

    resources.load([
        'shaders/default.fsh',
        'shaders/default.vsh',
        'shaders/debug.fsh',
        'shaders/debug.vsh',
        'shaders/ui.fsh',
        'shaders/ui.vsh',
        'shaders/sky.fsh',
        'shaders/sky.vsh',
        'shaders/terrain.fsh',
        'shaders/terrain.vsh',
        'shaders/textured.fsh',
        'shaders/textured.vsh',
        'img/octo.png',
        'img/crosshair.png',
        'img/heart.png',
        'img/heart-grey.png',
        'img/stone.png',
        'img/fork.png',
        'img/grass.jpg',
        'sounds/laser.wav',
        'sounds/hurt.wav',
        'sounds/hit.wav'
    ]);

    resources.onReady(init);
}

function initPage() {
    $('#ingame button.start').click(function() {
        actuallyStart();
        goFullscreen();
    });

    $('#ingame button.no').click(function() {
        actuallyStart();
    });

    $('#ingame button.fullscreen').click(function() {
        goFullscreen();
    });

    function goFullscreen() {
        var el = $('#ingame')[0];
        el.requestFullscreen = el.requestFullscreen ||
            el.mozRequestFullscreen ||
            el.mozRequestFullScreen || // Older API upper case 'S'.
            el.webkitRequestFullscreen;

        el.requestFullscreen();
    }

    function onFullscreenChange() {
        var el = document.webkitFullscreenElement ||
            document.mozFullscreenElement ||
            document.mozFullScreenElement;

        if(el) {
            el.requestPointerLock = el.requestPointerLock ||
                el.mozRequestPointerLock ||
                el.webkitRequestPointerLock;
            el.requestPointerLock();
            renderer.fullscreen = true;
            $('button.fullscreen').hide();
        }
        else {
            renderer.fullscreen = false;
            $('button.fullscreen').show();
        }

        resize();
    }

    function onPointerLockChange() {
        if (document.mozPointerLockElement ||
            document.webkitPointerLockElement) {
            console.log("Pointer Lock was successful.");
        } else {
            console.log("Pointer Lock was lost.");
        }
    }

    function onPointerLockError() {
        alert('error locking');
    }

    document.addEventListener('fullscreenchange', onFullscreenChange, false);
    document.addEventListener('mozfullscreenchange', onFullscreenChange, false);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange, false);

    document.addEventListener('pointerlockchange', onPointerLockChange, false);
    document.addEventListener('mozpointerlockchange', onPointerLockChange, false);
    document.addEventListener('webkitpointerlockchange', onPointerLockChange, false);

    document.addEventListener('pointerlockerror', onPointerLockError, false);
    document.addEventListener('mozpointerlockerror', onPointerLockError, false);
    document.addEventListener('webkitpointerlockerror', onPointerLockError, false);
}

$(function() {
    initPage();
    load();
});