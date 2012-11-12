
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

var resources = new Resources();
var stats;
var w = window.innerWidth;
var h = window.innerHeight;
var renderer;
var gl;

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

var Cube = SceneNode.extend({
    init: function(pos, rot, scale, wireframe) {
        this.parent(pos, rot, scale);
        this.wireframe = wireframe;
    },

    create: function(program) {
        this.program = program;

        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

        var vertices = [
            // front
            0, 0, 0,
            1, 0, 0,
            1, 1, 0,
            0, 1, 0,

            // left
            1, 0, 0,
            1, 0, 1,
            1, 1, 1,
            1, 1, 0,

            // right
            0, 0, 1,
            0, 0, 0,
            0, 1, 0,
            0, 1, 1,

            // back
            1, 0, 1,
            0, 0, 1,
            0, 1, 1,
            1, 1, 1,

            // top
            0, 1, 0,
            1, 1, 0,
            1, 1, 1,
            0, 1, 1,

            // bottom
            0, 0, 1,
            1, 0, 1,
            1, 0, 0,
            0, 0, 0
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        // Indices

        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        if(!this.wireframe) {
            // 6 sides, 2 triangles each, 3 vertices each tri
            var indices = new Uint16Array(6*2*3);
            var idx = 0;

            for(var i=0; i<vertices.length; i+=4) {
                indices[idx++] = i;
                indices[idx++] = i+1;
                indices[idx++] = i+2;

                indices[idx++] = i;
                indices[idx++] = i+2;
                indices[idx++] = i+3;
            }

            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        }
        else {
            // Wireframe
            var indices = new Uint16Array(6*8);
            var idx = 0;

            for(var i=0; i<vertices.length; i+=4) {
                indices[idx++] = i;
                indices[idx++] = i+1;

                indices[idx++] = i+1;
                indices[idx++] = i+2;

                indices[idx++] = i+2;
                indices[idx++] = i+3;

                indices[idx++] = i+3;
                indices[idx++] = i;
            }

            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        }
    },

    render: function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        var positionLocation = gl.getAttribLocation(this.program, "a_position");
        if(positionLocation != -1) {
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        if(this.wireframe) {
            gl.drawElements(gl.LINES, 6*8, gl.UNSIGNED_SHORT, 0);
        }
        else {
            gl.drawElements(gl.TRIANGLES, 6*2*3, gl.UNSIGNED_SHORT, 0);
        }
    }
});

var Player = SceneNode.extend({});

var Circular = SceneNode.extend({
    init: function(pos, rot, scale) {
        this.parent(pos, rot || [0., [0., 0., 1.]], scale);
    },

    update: function(dt) {
        quat4.rotateY(this.rot, Math.PI / 8. * dt);
    }
});

function init() {
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    renderer = new Renderer();
    renderer.init();

    var camera = new Camera([60, 10, 60]);
    renderer.setRoot(camera);

    var sceneX = 256*5;
    var sceneY = 256*5;

    var terrain = new Terrain(null, null, null, sceneX, sceneY);
    terrain.create();
    camera.addObject(terrain);

    var player = new Player();
    camera.addObject(player);

    var cube = new Cube([sceneX/2, 200, sceneY/2],
                        null,
                        [100, 100, 100]);
    cube.create(getProgram('terrain'));
    camera.addObject(cube);

    var circ = new Circular();
    cube.addObject(circ);

    for(var i=0; i<10; i++) {
        var c = new Cube([i*1.1+1.1, 0, 0], null, [.5, .5, .5]);
        c.create(getProgram('terrain'));
        circ.addObject(c);
    }

    var pers = mat4.create();
    mat4.perspective(45, w / h, 1.0, 5000.0, pers);

    iterPrograms(function(program) {
        gl.useProgram(program);
        var persLoc = gl.getUniformLocation(program, "pers");
        gl.uniformMatrix4fv(persLoc, false, pers);
    });

    gl.enable(gl.DEPTH_TEST);
    //gl.enable(gl.CULL_FACE);
    heartbeat();
}

var last = Date.now();
function heartbeat() {
    stats.begin();
    var now = Date.now();
    var dt = (now - last) / 1000.;

    renderer.update(dt);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    renderer.render();

    stats.end();
    last = now;
    requestAnimFrame(heartbeat);
}

window.addEventListener('load', function() {
    stats = new Stats();
    stats.setMode(1);
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.right = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);

    resources.load('resources/ben.mesh', DEFAULT_ATTRIB_ARRAYS);
    resources.load('resources/teapot.mesh', DEFAULT_ATTRIB_ARRAYS);
    resources.load('resources/grass.jpg');
    resources.onReady(init);
});
