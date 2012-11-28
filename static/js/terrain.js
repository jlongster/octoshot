
(function(SimplexNoise, SceneNode) {
    var seed = 124;
    function random() {
        seed = ((seed * 1103515245) + 12345) & 0x7fffffff;
        return seed / 0x7FFFFFFF;
    };

    var noise = new SimplexNoise(random);

    var Terrain = SceneNode.extend({
        init: function(pos, rot, scale, sizeX, sizeY) {
            this.parent(pos, rot, scale);

            this.sizeX = sizeX;
            this.sizeY = sizeY;

            var curX = 0;
            var curY = 0;

            while(curY < sizeY) {
                var sy = Math.min(sizeY - curY, 256);
                curX = 0;

                while(curX < sizeX) {
                    var sx = Math.min(sizeX - curX, 256);

                    this.addObject(new TerrainChunk([curX - Math.floor(curX/256),
                                                     0.,
                                                     curY - Math.floor(curY/256)],
                                                    null,
                                                    null,
                                                    sx,
                                                    sy));
                    curX += sx;
                }

                curY += sy;
            }
        },

        create: function() {
            this.children.forEach(function(child) {
                child.create();
            });
        }
    });

    Terrain.getHeight = function(x, y, smooth) {
        var v = noise.noise2D(x / 256, y / 256)*40;
        if(!smooth) {
            v += noise.noise2D(x/16, y/16) * 2.0;
        }
        return v;
    };

    var TerrainChunk = SceneNode.extend({
        init: function(pos, rot, scale, sizeX, sizeY) {
            if(sizeX*sizeY > Math.pow(2, 16)) {
                throw new Error('terrain is too large, x*y must be less than 2^16');
            }

            this.parent(pos, rot, scale);
            this.sizeX = sizeX;
            this.sizeY = sizeY;

            this.setMaterial(['terrain.vsh', 'terrain.fsh']);
        },

        create: function() {
            var sizeX = this.sizeX;
            var sizeY = this.sizeY;

            // Vertices

            this.vertexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

            var vertices = new Float32Array(sizeX*sizeY*3);

            for(var y=0; y<sizeY; y++) {
                for(var x=0; x<sizeX; x++) {
                    var i = (y*sizeX + x) * 3;
                    var posX = this.pos[0] + x;
                    var posY = this.pos[2] + y;

                    vertices[i] = x;
                    vertices[i+1] = Terrain.getHeight(posX, posY);
                    vertices[i+2] = y;
                }
            }

            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

            // Normals

            this.normalBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);

            var normals = new Float32Array(sizeX*sizeY*3);

            for(var y=0; y<sizeY; y++) {
                for(var x=0; x<sizeX; x++) {
                    var i = (y*sizeX + x) * 3;

                    var top = ((y == sizeY-1 ? y : y + 1) * sizeX + x) * 3 + 1;
                    var bottom = ((y == 0 ? y : y - 1) * sizeX + x) * 3 + 1;
                    var left = (y * sizeX + (x == sizeX - 1 ? x : x + 1)) * 3 + 1;
                    var right = (y * sizeX + (x == 0 ? x : x -1)) * 3 + 1;

                    var sx = vertices[left] - vertices[right];
                    var sy = vertices[top] - vertices[bottom];

                    var normal = vec3.create([-sx, 2, -sy]);
                    vec3.normalize(normal);

                    normals[i] = normal[0];
                    normals[i+1] = normal[1];
                    normals[i+2] = normal[2];
                }
            }

            gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

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
                    indices[i+1] = idx + sizeX;
                    indices[i+2] = idx + 1;

                    indices[i+3] = idx + sizeX;
                    indices[i+4] = idx + sizeX + 1;
                    indices[i+5] = idx + 1;

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
                          resources.get('img/grass.jpg'));
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
        },

        render: function() {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
            var positionLocation = this._program.getAttribLocation('a_position');
            if(positionLocation != -1) {
                gl.enableVertexAttribArray(positionLocation);
                gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
            var texLocation = this._program.getAttribLocation('a_texcoord');
            if(texLocation != -1) {
                gl.enableVertexAttribArray(texLocation);
                gl.vertexAttribPointer(texLocation, 2, gl.FLOAT, false, 0, 0);
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
            var normalLocation = this._program.getAttribLocation('a_normal');
            if(normalLocation != -1) {
                gl.enableVertexAttribArray(normalLocation);
                gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
            }

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.tex);
            var sampleLoc = this._program.getUniformLocation('sampler');
            if(!sampleLoc != -1) {
                gl.uniform1i(sampleLoc, 0);
            }

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.drawElements(gl.TRIANGLES, (this.sizeX-1)*(this.sizeY-1)*6, gl.UNSIGNED_SHORT, 0);
        }
    });

    if(typeof module !== 'undefined') {
        module.exports = Terrain;
    }
    else {
        window.Terrain = Terrain;
    }

}).apply(this, typeof module !== 'undefined' ?
         [require('./simplex-noise'), require('./node-shade').SceneNode] :
         [SimplexNoise,  sh.SceneNode]);