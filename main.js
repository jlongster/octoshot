
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
var sizeX = 100;
var sizeY = 100;
var vertexShader, fragmentShader, program;
var camera;

var canvas = document.getElementById('canvas');
canvas.width = w;
canvas.height = h;

var gl;

var IMG_BOSSES = 0;

function Camera(pos) {
    this.pos = pos;
    this.pitch = 0.;
    this.yaw = 0.;
    this.transformLoc = gl.getUniformLocation(program, "transform");
}

Camera.prototype._init = function() {
    this.transform = mat4.create();
    mat4.identity(this.transform);
};

Camera.prototype._rotate = function() {
    mat4.rotate(this.transform, Math.PI, [0, 1, 0]);
};

Camera.prototype._translate = function() {
    mat4.translate(this.transform, [-this.pos[0], -this.pos[1], -this.pos[2]]);
};

Camera.prototype._apply = function() {
    gl.uniformMatrix4fv(this.transformLoc, false, this.transform);
};

Camera.prototype.update = function(dt) {
    this._init();

    var mouse = getMouseMoved();
    this.pitch += mouse[0] * dt;
    this.yaw += mouse[1] * dt;
    
    this._rotate();
    mat4.rotate(this.transform, -this.yaw, [1, 0, 0]);
    mat4.rotate(this.transform, this.pitch, [0, 1, 0]);

    var forward = vec3.create();
    var side = vec3.create();
    mat4.multiplyVec3(this.transform, [0, 0, -1], forward);
    mat4.multiplyVec3(this.transform, [1, 0, 0], side);
    forward[0] = -forward[0];
    side[2] = -side[2];
    
    if(isDown('UP')) {
        var res = vec3.create();
        vec3.add(this.pos, forward, res);
        this.pos = res;
    }

    if(isDown('DOWN')) {
        var res = vec3.create();
        vec3.subtract(this.pos, forward, res);
        this.pos = res;
    }

    if(isDown('LEFT')) {
        var res = vec3.create();
        vec3.subtract(this.pos, side, res);
        this.pos = res;
    }

    if(isDown('RIGHT')) {
        var res = vec3.create();
        vec3.add(this.pos, side, res);
        this.pos = res;
    }

    this._translate();
    this._apply();
}

function createShader(id) {
    var el = document.getElementById(id);
    if(!el) {
        return null;
    }

    var src = el.text;
    var type;

    if(el.type == 'x-shader/x-vertex') {
        type = gl.VERTEX_SHADER;
    }
    else if(el.type == 'x-shader/x-fragment') {
        type = gl.FRAGMENT_SHADER;
    }
    else {
        throw new Error('unknown shader type: ' + id);
    }

    var shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    var status = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if(!status) {
        var err = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error('shader compilation error (' + id + '): ' + err);
    }

    return shader;
}

function init() {
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    // Vertices

    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    var vertices = new Float32Array(sizeX*sizeY*3);

    for(var y=0; y<sizeY; y++) {
        for(var x=0; x<sizeX; x++) {
            var i = (y*sizeX + x) * 3;
            vertices[i] = x;
            vertices[i+1] = Math.random() * 2.0;
            vertices[i+2] = y;
        }
    }

    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Indices

    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    var indices = new Uint16Array((sizeX - 1) * (sizeY - 1) * 6);
    
    for(var y=0; y<sizeY - 1; y++) {
        for(var x=0; x<sizeX - 1; x++) {
            var idx = (y * sizeX + x);
            var i = (y * (sizeX-1) + x) * 6;

            indices[i] = idx;
            indices[i+1] = idx + 1;
            indices[i+2] = idx + sizeX;

            indices[i+3] = idx + sizeX;
            indices[i+4] = idx + 1;
            indices[i+5] = idx + sizeX + 1;
        }
    }

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    // Shaders and stuff

    vertexShader = createShader('vertex-shader');
    fragmentShader = createShader('fragment-shader');

    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    var status = gl.getProgramParameter(program, gl.LINK_STATUS);
    if(!status) {
        var err = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error('program linking error: ' + err);
    }

    gl.useProgram(program);

    var positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

    var pers = mat4.create();
    mat4.perspective(45, w / h, 0.1, 1000.0, pers);

    var persLoc = gl.getUniformLocation(program, "pers");
    gl.uniformMatrix4fv(persLoc, false, pers);

    camera = new Camera([0, 10, 0]);

    heartbeat();
}

var last = Date.now();
function heartbeat() {
    stats.begin();
    var now = Date.now();
    var dt = (now - last) / 1000.;

    camera.update(dt);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawElements(gl.TRIANGLES, (sizeX-1)*(sizeY-1)*6, gl.UNSIGNED_SHORT, 0);

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

    //resources.load(IMG_BOSSES, "resources/bosses.png");
    resources.onReady(init);
});
