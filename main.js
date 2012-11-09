
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
    offset: 5,
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

function Mesh(url, pos) {
    this.pos = pos;
    this.transform = mat4.create();
    this.url = url;
    this.attribDesc = DEFAULT_ATTRIB_ARRAYS;

    // resources.load(url, this.attribDesc);

    var mat = mat4.create();
    mat4.identity(mat);
    mat4.translate(mat, pos, this.transform);
    mat4.scale(this.transform, [60, 60, 60], this.transform);
}

Mesh.prototype.create = function(program) {
    var mesh = resources.get(this.url);

    this.attribBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.attribBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh[0], gl.STATIC_DRAW);

    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    var indices = convertToWireframe(mesh[1]);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    this.numIndices = indices.length;
    this.program = program;

    this.attribs = {};
    var numAttribs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for(var i=0; i<numAttribs; i++) {
        var attrib = gl.getActiveAttrib(program, i);
        this.attribs[attrib.name] = gl.getAttribLocation(program,
                                                         attrib.name);
    }

    this.uniforms = {};
    var numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for(var i=0; i<numUniforms; i++) {
        var uniform = gl.getActiveUniform(program, i);
        this.uniforms[uniform.name] = gl.getUniformLocation(program,
                                                            uniform.name);
    }

};

Mesh.prototype.render = function() {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.attribBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    for(var i=0; i<this.attribDesc.length; i++) {
        var desc = this.attribDesc[i];
        var loc = this.attribs[desc.name];

        if(loc !== undefined) {
            gl.enableVertexAttribArray(loc);

            // Assume float
            gl.vertexAttribPointer(loc, desc.size, gl.FLOAT,
                                   !!desc.normalized, 4*desc.stride,
                                   4*desc.offset);
        }
    }

    gl.drawElements(gl.LINES, this.numIndices, gl.UNSIGNED_SHORT, 0);
};

function init() {
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    var pers = mat4.create();
    mat4.perspective(45, w / h, 0.1, 1000.0, pers);

    renderer = new Renderer(new Camera([20, 10, 20]));
    renderer.init();
    var terrain = new Terrain(0, 0, 256*3, 256*3);
    terrain.create();
    renderer.addObject(terrain);

    var mesh = new Mesh('resources/ben.mesh', [50, 20, 50]);
    mesh.create(getProgram('default'));
    renderer.addObject(mesh);

    iterPrograms(function(program) {
        gl.useProgram(program);
        var persLoc = gl.getUniformLocation(program, "pers");
        gl.uniformMatrix4fv(persLoc, false, pers);
    });

    gl.enable(gl.DEPTH_TEST);
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
    resources.load('resources/grass.jpg');
    resources.onReady(init);
});
