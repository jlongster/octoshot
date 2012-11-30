
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

function init() {
    renderer = new sh.Renderer(w, h);
    scene = new sh.Scene(255 * 4, 255 * 4);
    server = new ServerConnection();

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

    var terrain = new Terrain(null, null, null,
                              scene.sceneWidth,
                              scene.sceneDepth);
    terrain.create();
    scene.addObject(terrain);

    //document.getElementById('loading').style.display = 'none';

    serverEvents.init();
    messages.init();
    window.onresize = resize;

    onGameStart();
    heartbeat();
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
}

// Various screens for the game

function initPage() {
    $('#intro button.play').click(function() {
        showInGame();
    });

    $('#ingame button.start').click(function() {
        actuallyStart();

        var el = $('#ingame')[0];
        el.requestFullscreen = el.requestFullscreen ||
            el.mozRequestFullscreen ||
            el.mozRequestFullScreen || // Older API upper case 'S'.
            el.webkitRequestFullscreen;

        el.requestFullscreen();
    });

    $('#ingame button.no').click(function() {
        actuallyStart();
    });

    function actuallyStart() {
        var el = $('#ingame')[0];
        $('.initialOverlay', el).hide();
        input.activate();
        messages.notify("Press T to bring up chat, ESC to close it");
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
        }
        else {
            renderer.fullscreen = false;
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

    showIntro();
}

function showIntro() {
    $('body')[0].className = 'intro';
    stopped = true;
    input.deactivate();
}

function showInstructions() {
    $('body')[0].className = 'instructions';
    stopped = true;
    input.deactivate();
}

function showInGame() {
    $('body')[0].className = 'ingame';
    stopped = false;
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
        'img/grass.jpg',
        'sounds/laser.wav'
    ]);

    resources.onReady(init);
}

function onGameStart() {
    $('#ingame .initialOverlay').show();
}

$(initPage);