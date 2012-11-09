
var noise = new SimplexNoise(Math.random);

function Terrain(x, y, sizeX, sizeY) {
    this.x = x;
    this.y = y;
    this.sizeX = sizeX;
    this.sizeY = sizeY;
    this.children = [];

    this.transform = mat4.create();
    mat4.identity(this.transform);
    
    var v = mat4.create();
    mat4.identity(v);
    mat4.translate(v, [this.x, 0, this.y], this.transform);

    createProgram('terrain',
                  getShader('vertex-shader'),
                  getShader('fragment-shader'));

    var curX = 0;
    var curY = 0;

    while(curY < sizeY) {
        var sy = Math.min(sizeY - curY, 256);
        curX = 0;

        while(curX < sizeX) {
            var sx = Math.min(sizeX - curX, 256);

            this.children.push(new TerrainChunk(curX - Math.floor(curX/256),
                                                curY - Math.floor(curY/256),
                                                sx,
                                                sy));
            curX += sx;
        }

        curY += sy;
    }
}

Terrain.prototype.create = function() {
    this.children.forEach(function (c) {
        c.create();
    });
};

Terrain.prototype.render = function() {
};

Terrain.getHeight = function(x, y, smooth) {
    var v = noise.noise2D(x / 128, y / 128)*15;
    if(!smooth) {
        v += (noise.noise2D(x/8, y/8));
    }
    return v;
};

function TerrainChunk(x, y, sizeX, sizeY) {
    if(sizeX*sizeY > Math.pow(2, 16)) {
        throw new Error('terrain is too large, x*y must be less than 2^16');
    }

    this.x = x;
    this.y = y;
    this.sizeX = sizeX;
    this.sizeY = sizeY;
    this.program = getProgram('terrain');

    this.transform = mat4.create();
    mat4.identity();

    var v = mat4.create();
    mat4.identity(v);
    mat4.translate(v, [this.x, 0, this.y], this.transform);
}

TerrainChunk.prototype.create = function() {
    var sizeX = this.sizeX;
    var sizeY = this.sizeY;

    // Vertices

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

    var vertices = new Float32Array(sizeX*sizeY*3);

    for(var y=0; y<sizeY; y++) {
        for(var x=0; x<sizeX; x++) {
            var i = (y*sizeX + x) * 3;
            var posX = this.x + x;
            var posY = this.y + y;

            vertices[i] = x;
            vertices[i+1] = Terrain.getHeight(posX, posY);
            vertices[i+2] = y;
        }
    }

    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Indices

    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    var indices = new Uint16Array((sizeX - 1) * (sizeY - 1) * 6);

    var m = 0;
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

            if(idx + sizeX + 1 > m) {
                m = idx + sizeX + 1;
            }
        }
    }

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    // Textures

    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
                  resources.get('resources/grass.jpg'));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    this.texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);

    var coords = new Float32Array(sizeX*sizeY*2);

    for(var y=0; y<sizeY; y++) {
        for(var x=0; x<sizeX; x++) {
            var i = (y*sizeX + x) * 2;
            coords[i] = x/sizeX * 2;
            coords[i+1] = y/sizeY * 2;
        }
    }

    gl.bufferData(gl.ARRAY_BUFFER, coords, gl.STATIC_DRAW);
};

TerrainChunk.prototype.render = function() {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    var positionLocation = gl.getAttribLocation(this.program, "a_position");
    if(positionLocation != -1) {
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
    var texLocation = gl.getAttribLocation(this.program, "a_texcoord");
    if(texLocation != -1) {
        gl.enableVertexAttribArray(texLocation);
        gl.vertexAttribPointer(texLocation, 2, gl.FLOAT, false, 0, 0);
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    var sampleLoc = gl.getUniformLocation(this.program, "sampler");
    if(!sampleLoc != -1) {
        gl.uniform1i(sampleLoc, 0);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.drawElements(gl.TRIANGLES, (this.sizeX-1)*(this.sizeY-1)*6, gl.UNSIGNED_SHORT, 0);
};
