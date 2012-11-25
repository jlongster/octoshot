var sh = {};
sh.util = {};
var glMatrix = require('./shade/gl-matrix');

var glMatrixArrayType = glMatrix.MatrixArray;
var MatrixArray = glMatrix.MatrixArray;
var setMatrixArrayType = glMatrix.setMatrixArrayType;
var determineMatrixArrayType = glMatrix.determineMatrixArrayType;
var glMath = glMatrix.glMath;
var vec2 = glMatrix.vec2;
var vec3 = glMatrix.vec3;
var vec4 = glMatrix.vec4;
var mat2 = glMatrix.mat2;
var mat3 = glMatrix.mat3;
var mat4 = glMatrix.mat4;
var quat4 = glMatrix.quat4;

quat4.rotateX = function (quat, angle, dest) {
    if (!dest) { dest = quat; }

    angle *= 0.5; 

    var qax = quat[0], qay = quat[1], qaz = quat[2], qaw = quat[3],
        qbx = Math.sin(angle), qbw = Math.cos(angle);

    dest[0] = qax * qbw + qaw * qbx;
    dest[1] = qay * qbw + qaz * qbx;
    dest[2] = qaz * qbw - qay * qbx;
    dest[3] = qaw * qbw - qax * qbx;
};

quat4.rotateY = function (quat, angle, dest) {
    if (!dest) { dest = quat; }

    // TODO: optimize this
    angle *= 0.5;

    quat4.multiply(quat,
                   [0, Math.sin(angle), 0, Math.cos(angle)],
                   dest);
};

quat4.rotateZ = function (quat, angle, dest) {
    if (!dest) { dest = quat; }

    // TODO: optimize this
    angle *= 0.5;

    quat4.multiply(quat,
                   [0, 0, Math.sin(angle), Math.cos(angle)],
                   dest);
};
(function() {
    // A simple class system, more documentation to come

    function extend(cls, name, props) {
        var prototype = Object.create(cls.prototype);
        var fnTest = /xyz/.test(function(){ xyz; }) ? /\bparent\b/ : /.*/;
        props = props || {};

        for(var k in props) {
            var src = props[k];
            var parent = prototype[k];

            if(typeof parent == "function" &&
               typeof src == "function" &&
               fnTest.test(src)) {
                prototype[k] = (function (src, parent) {
                    return function() {
                        // Save the current parent method
                        var tmp = this.parent;

                        // Set parent to the previous method, call, and restore
                        this.parent = parent;
                        var res = src.apply(this, arguments);
                        this.parent = tmp;

                        return res;
                    };
                })(src, parent);
            }
            else {
                prototype[k] = src;
            }
        }

        prototype.typename = name;

        var new_cls = function() { 
            if(prototype.init) {
                prototype.init.apply(this, arguments);
            }
        };

        new_cls.prototype = prototype;
        new_cls.prototype.constructor = new_cls;

        new_cls.extend = function(name, props) {
            if(typeof name == "object") {
                props = name;
                name = "anonymous";
            }
            return extend(new_cls, name, props);
        };

        return new_cls;
    }

    sh.Obj = extend(Object, "Object", {});
})();
sh.Program = sh.Obj.extend({
    init: function(shaders) {
        var program = gl.createProgram();
        shaders.forEach(function(shader) {
            gl.attachShader(program,
                            resources.get('shaders/' + shader));
        });
        gl.linkProgram(program);
        gl.useProgram(program);

        var status = gl.getProgramParameter(program, gl.LINK_STATUS);
        if(!status) {
            var err = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error('program linking error: ' + err);
        }

        // Cache uniform locations
        this.program = program;
        this.worldTransformLoc = this.getUniformLocation("worldTransform");
        this.modelTransformLoc = this.getUniformLocation("modelTransform");
        this.normalLoc = this.getUniformLocation("normalMatrix");
    },

    getUniformLocation: function(uniform) {
        var loc = gl.getUniformLocation(this.program, uniform);
        if(loc === -1) {
            return null;
        }
        return loc;
    },

    getAttribLocation: function(attrib) {
        var loc = gl.getAttribLocation(this.program, attrib);
        if(loc === -1) {
            return null;
        }
        return loc;
    },

    use: function() {
        gl.useProgram(this.program);
    }
});
sh.Resources = sh.Obj.extend({
    init: function() {
        this.resourceCache = new Array(1000);
        this.readyCallbacks = [];
    },

    load: function(urlOrArr) {
        if(urlOrArr instanceof Array) {
            urlOrArr.forEach(function(url) {
                this._load(url);
            }, this);
        }
        else {
            this._load(urlOrArr);
        }
    },

    _load: function(url /* , loader args */) {
        var args = Array.prototype.slice.call(arguments);

        if(this.resourceCache[url] === undefined) {
            var matches = url.match(/\.([^\.]*)$/);
            var ext = matches[1];
            this.resourceCache[url] = false;
            var loader;

            if(ext == 'mesh') {
                loader = this.loadMesh;
            }
            else if(ext == 'vsh') {
                loader = this.loadVertexShader;
            }
            else if(ext == 'fsh') {
                loader = this.loadFragmentShader;
            }
            else {
                loader = this.loadImage;
            }

            loader.apply(this, args);
        }
    },

    onLoaded: function(url, obj) {
        this.resourceCache[url] = obj;

        if(this.isReady()) {
            this.readyCallbacks.forEach(function(func) {
                func();
            });
            this.readyCallbacks = [];
        }
    },

    onFailure: function(url) {
        console.log('failed to load resource: ' + url);
    },

    loadText: function(url, then) {
        var req = new XMLHttpRequest();
        var _this = this;

        req.onload = function() {
            if(req.status === 200 || req.status === 0) {
                then(req.responseText);
            }
        };

        req.onerror = function(err) {
            _this.onFailure(url);
        };

        req.open('GET', url, true);
        req.send(null);
    },

    loadMesh: function(url, attribArrays) {
        this.loadText(url, function(src) {
            var mesh = sh.util.decompressSimpleMesh(src, attribArrays);
            _this.onLoaded(url, mesh);
        });
    },

    loadVertexShader: function(url) {
        this._loadShader(url, gl.VERTEX_SHADER);
    },

    loadFragmentShader: function(url) {
        this._loadShader(url, gl.FRAGMENT_SHADER);
    },

    _loadShader: function(url, type) {
        var _this = this;

        this.loadText(url, function(src) {
            var shader = gl.createShader(type);
            gl.shaderSource(shader, src);
            gl.compileShader(shader);

            var status = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
            if(!status) {
                var err = gl.getShaderInfoLog(shader);
                gl.deleteShader(shader);
                throw new Error('shader compilation error (' + url + '): ' + err);
            }

            _this.onLoaded(url, shader);
        });
    },

    loadImage: function(url) {
        var img = new Image();
        var _this = this;

        img.onload = function() {
            _this.onLoaded(url, img);
        };
        img.onerror = function(err) {
            _this.onFailure(url);
        };

        img.src = url;
    },

    get: function(url) {
        return this.resourceCache[url];
    },

    isReady: function() {
        var ready = true;
        for(var k in this.resourceCache) {
            if(!this.resourceCache[k]) {
                ready = false;
            }
        }
        return ready;
    },

    onReady: function(func) {
        if(this.isReady()) {
            func();
        }
        else {
            this.readyCallbacks.push(func);
        }
    }
});(function() {

var SceneNode = sh.Obj.extend({
    init: function(pos, rot, scale) {
        // TODO: proper type checking
        if(pos && !pos.length) {
            var opts = pos;
            pos = opts.pos;
            rot = opts.rot;
            scale = opts.scale;

            if(opts.update) {
                this.update = opts.update;
            }

            if(opts.render) {
                this.render = opts.render;
            }
        }

        this.pos = pos || vec3.create([0, 0, 0]);
        this.rot = rot || vec3.create([0, 0, 0]);
        this.scale = scale || vec3.create([1, 1, 1]);
        this.transform = mat4.create();
        this.worldTransform = mat4.create();
        this._program = null;

        this.quat = quat4.fromAngleAxis(0.0, [0.0, 1.0, 0.0]);
        this.useQuat = false;

        this._scaleMatrix = mat4.create();
        mat4.identity(this._scaleMatrix);

        this._realTransform = mat4.create();

        this.children = [];
        this._dirty = true;
        this._dirtyWorld = true;

        this.transformLoc = null;
        this.normalLoc = null;
        this.shaders = ['default.vsh', 'default.fsh'];
    },

    setMaterial: function(shaders) {
        this.shaders = shaders;
    },

    addObject: function(obj, inits) {
        if(typeof obj == 'function') {
            inits = inits || {};
            var o = new SceneNode(inits.pos, inits.rot, inits.scale);
            o.update = obj;
            obj = o;
        }

        obj._parent = this;
        this.children.push(obj);

        SceneNode.fireAdd(obj);
        return obj;
    },

    removeObject: function(obj) {
        for(var i=0, l=this.children.length; i<l; i++) {
            if(this.children[i] == obj) {
                this.children.splice(i, 1);
                break;
            }
        }

        SceneNode.fireRemove(obj);
    },

    setPos: function(x, y, z) {
        this.pos[0] = x;
        this.pos[1] = y;
        this.pos[2] = z;
        this._dirty = true;
    },

    setRot: function(xOrQuat, y, z) {
        if(this.useQuat) {
            this.quat = xOrQuat;
        }
        else {
            this.rot[0] = xOrQuat;
            this.rot[1] = y;
            this.rot[2] = z;
        }
        this._dirty = true;
    },

    setScale: function(x, y, z) {
        this.scale[0] = x;
        this.scale[1] = y;
        this.scale[2] = z;
        this._dirty = true;
    },

    translate: function(x, y, z) {
        this.pos[0] += x;
        this.pos[1] += y;
        this.pos[2] += z;
        this._dirty = true;
    },

    translateX: function(v) {
        this.pos[0] += v;
        this._dirty = true;
    },

    translateY: function(v) {
        this.pos[1] += v;
        this._dirty = true;
    },

    translateZ: function(v) {
        this.pos[2] += v;
        this._dirty = true;
    },

    // rotate: function(angle, axis) {

    //     var rot = quat4.fromAngleAxis(angle, axis);
    //     quat4.multiply(this.rot, rot);
    //     this._dirty = true;
    // },

    rotateX: function(v) {
        if(this.useQuat) {
            quat4.rotateX(this.quat, v);
        }
        else {
            this.rot[0] += v;
        }
        this._dirty = true;
    },

    rotateY: function(v) {
        if(this.useQuat) {
            quat4.rotateY(this.quat, v);
        }
        else {
            this.rot[1] += v;
        }
        this._dirty = true;
    },

    rotateZ: function(v) {
        if(this.useQuat) {
            quat4.rotateZ(this.quat, v);
        }
        else {
            this.rot[2] += v;
        }
        this._dirty = true;
    },

    scale: function(x, y, z) {
        this.scale[0] += x;
        this.scale[1] += y;
        this.scale[2] += z;
        this._dirty = true;
    },

    scaleX: function(v) {
        this.scale[0] += v;
        this._dirty = true;
    },

    scaleY: function(v) {
        this.scale[1] += v;
        this._dirty = true;
    },

    scaleZ: function(v) {
        this.scale[2] += v;
        this._dirty = true;
    },

    traverse: function(func) {
        func(this);

        for(var i=0, l=this.children.length; i<l; i++) {
            this.children[i].traverse(func);
        }
    },

    needsWorldUpdate: function() {
        return this._dirty || this._dirtyWorld;
    },

    updateMatrices: function(force) {
        var parent = this._parent;

        if(this._dirty) {
            if(this.useQuat) {
                mat4.fromRotationTranslation(this.quat, this.pos, this.transform);
            }
            else {
                mat4.identity(this.transform);
                mat4.translate(this.transform, this.pos);
                mat4.rotateZ(this.transform, this.rot[2]);
                mat4.rotateY(this.transform, this.rot[1]);
                mat4.rotateX(this.transform, this.rot[0]);
                mat4.scale(this.transform, this.scale);
            }

            // if(this.scale[0] !== 1.0 &&
            //    this.scale[1] !== 1.0 &&
            //    this.scale[2] !== 1.0) {
            //     var scaleM = this._scaleMatrix;
            //     scaleM[0] = this.scale[0];
            //     scaleM[5] = this.scale[1];
            //     scaleM[10] = this.scale[2];
            //     mat4.multiply(this.transform, scaleM, this.transform);
            // }

            this._dirty = false;
            this._dirtyWorld = true;
        }

        if(this._dirtyWorld || force) {
            if(parent) {
                mat4.multiply(parent.worldTransform,
                              this.transform,
                              this.worldTransform);
            }
            else {
                mat4.set(this.transform, this.worldTransform);
            }

            if(this.preMatrix) {
                mat4.multiply(this.worldTransform,
                              this.preMatrix,
                              this._realTransform);
            }
            else {
                mat4.set(this.worldTransform, this._realTransform);
            }

            this._dirtyWorld = false;
        }
    },

    render: function() {
    },

    update: function() {
    }
});

SceneNode.onAdd = function(func) {
    if(!SceneNode._onAdd) {
        SceneNode._onAdd = [];
    }

    SceneNode._onAdd.push(func);
};

SceneNode.fireAdd = function(obj) {
    var _onAdd = SceneNode._onAdd;

    if(_onAdd) {
        for(var i=0, l=_onAdd.length; i<l; i++) {
            _onAdd[i](obj);
        }
    }
};

SceneNode.onRemove = function(func) {
    if(!SceneNode._onRemove) {
        SceneNode._onRemove = [];
    }

    SceneNode._onRemove.push(func);
};

SceneNode.fireRemove = function(obj) {
    var _onRemove = SceneNode._onRemove;

    if(_onRemove) {
        for(var i=0, l=_onRemove.length; i<l; i++) {
            _onRemove[i](obj);
        }
    }
};

sh.SceneNode = SceneNode;
})();
sh.Mesh = sh.SceneNode.extend({
    init: function(pos, rot, scale, url) {
        this.parent(pos, rot, scale);
        this.url = url;
        this.attribDesc = DEFAULT_ATTRIB_ARRAYS;
    },

    create: function(program) {
        var mesh = resources.get(this.url);
        program = program || getProgram('default');

        this.attribBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.attribBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, mesh[0], gl.STATIC_DRAW);

        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        //var indices = convertToWireframe(mesh[1]);
        var indices = mesh[1];
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

        this.setMaterial(program);
    },

    render: function() {
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

        gl.drawElements(gl.TRIANGLES, this.numIndices, gl.UNSIGNED_SHORT, 0);
    }
});

sh.CubeMesh = sh.Obj.extend({
    create: function() {
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

        // Normals

        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);

        var normals = [
            // front
            0, 0, -1,
            0, 0, -1,
            0, 0, -1,
            0, 0, -1,

            // left
            1, 0, 0,
            1, 0, 0,
            1, 0, 0,
            1, 0, 0,

            // right
            -1, 0, 0,
            -1, 0, 0,
            -1, 0, 0,
            -1, 0, 0,

            // back
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,

            // top
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,

            // bottom
            0, -1, 0,
            0, -1, 0,
            0, -1, 0,
            0, -1, 0
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
        
        // Indices

        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        // 6 sides, 2 triangles each, 3 vertices each tri
        var indices = new Uint16Array(6*2*3);
        var idx = 0;

        for(var i=0; i<vertices.length; i+=4) {
            indices[idx++] = i;
            indices[idx++] = i+2;
            indices[idx++] = i+1;

            indices[idx++] = i;
            indices[idx++] = i+3;
            indices[idx++] = i+2;
        }

        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        // Wireframe

        this.wireIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.wireIndexBuffer);

        var wireIndices = new Uint16Array(6*8);
        idx = 0;

        for(var i=0; i<vertices.length; i+=4) {
            wireIndices[idx++] = i;
            wireIndices[idx++] = i+1;

            wireIndices[idx++] = i+1;
            wireIndices[idx++] = i+2;

            wireIndices[idx++] = i+2;
            wireIndices[idx++] = i+3;

            wireIndices[idx++] = i+3;
            wireIndices[idx++] = i;
        }

        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, wireIndices, gl.STATIC_DRAW);
    },

    render: function(program, wireframe) {
        renderer.bindAndEnableBuffer(program, this.vertexBuffer, 'a_position');
        renderer.bindAndEnableBuffer(program, this.normalBuffer, 'a_normal');

        if(wireframe) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.wireIndexBuffer);
            gl.drawElements(gl.LINES, 6*8, gl.UNSIGNED_SHORT, 0);
        }
        else {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.drawElements(gl.TRIANGLES, 6*2*3, gl.UNSIGNED_SHORT, 0);
        }
    }
});

sh.Cube = sh.SceneNode.extend({
    init: function(pos, rot, scale, opts) {
        this.parent(pos, rot, scale);
        this.wireframe = opts && opts.wireframe;

        if(opts && opts.centered) {
            this.preMatrix = mat4.create();
            mat4.identity(this.preMatrix);
            mat4.translate(this.preMatrix, [-.5, -.5, -.5]);
        }

        if(!sh.Cube.mesh) {
            sh.Cube.mesh = new sh.CubeMesh();
            sh.Cube.mesh.create();
        }
    },

    render: function() {
        // TODO: don't dig into the program object like this
        sh.Cube.mesh.render(this._program.program, this.wireframe);

        // if(normalLocation != -1) {
        //     gl.disableVertexAttribArray(normalLocation);
        // }
    }
});

sh.Camera = sh.SceneNode.extend({
    init: function(pos) {
        this.parent(pos);
        // Default position should be looking at a positive Z axis
        this.rotateY(Math.PI);
        this.inverseTransform = mat4.create();
    },

    moveLeft: function(v) {
        var left = vec3.create([-1, 0, 0]);
        var quat = quat4.fromAngleAxis(this.rot[1], [0, 1, 0]);
        quat4.multiplyVec3(quat, left);
        vec3.scale(left, v);
        this.translate(left[0], left[1], left[2]);
    },

    moveRight: function(v) {
        var right = vec3.create([1, 0, 0]);
        var quat = quat4.fromAngleAxis(this.rot[1], [0, 1, 0]);
        quat4.multiplyVec3(quat, right);
        vec3.scale(right, v);
        this.translate(right[0], right[1], right[2]);
    },

    moveForward: function(v) {
        var forward = vec3.create([0, 0, -1]);
        var quat = quat4.fromAngleAxis(this.rot[1], [0, 1, 0]);
        quat4.multiplyVec3(quat, forward);
        vec3.scale(forward, v);
        this.translate(forward[0], forward[1], forward[2]);
    },

    moveBack: function(v) {
        var back = vec3.create([0, 0, 1]);
        var quat = quat4.fromAngleAxis(this.rot[1], [0, 1, 0]);
        quat4.multiplyVec3(quat, back);
        vec3.scale(back, v);
        this.translate(back[0], back[1], back[2]);
    },

    updateMatrices: function() {
        var dirty = this._dirty;
        this.parent();

        if(dirty) {
            mat4.inverse(this._realTransform, this.inverseTransform);
        }
    }
});

sh.Renderer = sh.Obj.extend({
    init: function() {
        this.root = new sh.SceneNode();
        this.persMatrix = mat4.create();

        this._objects = [];
        this._objectsById = {};
        this._bufferCache = {};
        this._programCache = {};
        this._behaviors = [];

        this._normalMatrix = mat3.create();
        this._worldTransform = mat4.create();

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        var _this = this;
        sh.SceneNode.onAdd(function(obj) {
            _this._objects.push(obj);

            if(obj.id) {
                _this._objectsById[obj.id] = obj;
            }
        });

        sh.SceneNode.onRemove(function(obj) {
            _this._objects.splice(_this._objects.indexOf(obj), 1);

            if(obj.id) {
                _this._objectsById[obj.id] = null;
            }
        });
    },

    setCamera: function(camera) {
        this.camera = camera;
    },

    getCamera: function() {
        return this.camera;
    },

    addObject: function(obj) {
        this.root.addObject(obj);
    },

    getObject: function(id) {
        return this._objectsById[id];
    },

    addBehavior: function(obj) {
        this._behaviors.push(obj);
    },

    perspective: function(fov, ratio, near, far) {
        mat4.perspective(fov, ratio, near, far, this.persMatrix);
    },

    update: function(dt) {
        this.camera.update(dt);
        this.camera.updateMatrices();

        this.updateObject(this.root, dt);

        for(var i=0, l=this._behaviors.length; i<l; i++) {
            this._behaviors[i].update(dt);
        }
    },

    updateObject: function(obj, dt, force) {
        obj.update(dt);

        var dirty = obj.needsWorldUpdate();
        obj.updateMatrices(force);

        var children = obj.children;
        for(var i=0, l=children.length; i<l; i++) {
            this.updateObject(children[i], dt, dirty || force);
        }
    },

    loadProgram: function(obj) {
        if(obj.shaders) {
            // Copy the shader array and sort it
            var sorted = obj.shaders.slice(0);
            sorted.sort();

            // If a program with the same shaders already exists, use it
            var cacheKey = sorted.join(';');
            if(this._programCache[cacheKey]) {
                return this._programCache[cacheKey];
            }

            var program = new sh.Program(sorted);
            this._programCache[cacheKey] = program;
            return program;
        }

        return null;
    },

    render: function() {
        if(!this.camera) {
            return;
        }

        mat4.multiply(this.persMatrix,
                      this.camera.inverseTransform,
                      this._worldTransform);

        var objs = this._objects;
        var lastProg = null;

        for(var i=0, l=objs.length; i<l; i++) {
            var obj = objs[i];

            if(!obj._program) {
                obj._program = this.loadProgram(obj);
            }

            var prog = obj._program;

            if(prog) {
                if(!lastProg || lastProg != prog) {
                    prog.use();
                    lastProg = prog;

                    if(prog.worldTransformLoc) {
                        gl.uniformMatrix4fv(prog.worldTransformLoc,
                                            false,
                                            this._worldTransform);
                    }
                }

                gl.uniformMatrix4fv(prog.modelTransformLoc,
                                    false,
                                    obj._realTransform);

                if(prog.normalLoc) {
                    mat4.toInverseMat3(obj._realTransform, this._normalMatrix);
                    mat3.transpose(this._normalMatrix);
                    
                    gl.uniformMatrix3fv(prog.normalLoc,
                                        false,
                                        this._normalMatrix);
                }

                obj.render();
            }
        }
    },

    bindAndEnableBuffer: function(program, buf, attrib) {
        //if(this._bufferCache[attrib] != buf) {
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            var loc = gl.getAttribLocation(program, attrib);
            if(loc != -1) {
                gl.enableVertexAttribArray(loc);
                gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
            }

            this._bufferCache[attrib] = buf;
        //}
    }
});
(function() {
    // TODO: will it be an optimization to specialize this method at
    // runtime for different combinations of stride, decodeOffset and
    // decodeScale?
    function decompressInner_(str, inputStart, inputEnd,
                              output, outputStart, stride,
                              decodeOffset, decodeScale) {
        var prev = 0;
        for (var j = inputStart; j < inputEnd; j++) {
            var code = str.charCodeAt(j);
            prev += (code >> 1) ^ (-(code & 1));
            output[outputStart] = decodeScale * (prev + decodeOffset);
            outputStart += stride;
        }
    }

    function decompressSimpleMesh(str, attribArrays) {
        var numVerts = str.charCodeAt(0);
        if (numVerts >= 0xE000) numVerts -= 0x0800;
        numVerts++;

        // Extract conversion parmaters from attribArrays.
        var stride = attribArrays[0].stride;  // TODO: generalize.
        var decodeOffsets = new Float32Array(stride);
        var decodeScales = new Float32Array(stride);
        var numArrays = attribArrays.length;
        for (var i = 0; i < numArrays; i++) {
            var attribArray = attribArrays[i];
            var end = attribArray.offset + attribArray.size;
            for (var j = attribArray.offset; j < end; j++) {
                decodeOffsets[j] = attribArray.decodeOffset;
                decodeScales[j] = attribArray.decodeScale;
            }
        }

        // Decode attributes.
        var inputOffset = 1;
        var attribsOut = new Float32Array(stride * numVerts);
        for (var i = 0; i < stride; i++) {
            var end = inputOffset + numVerts;
            var decodeScale = decodeScales[i];
            if (decodeScale) {
                // Assume if decodeScale is never set, simply ignore the
                // attribute.
                decompressInner_(str, inputOffset, end,
                                 attribsOut, i, stride,
                                 decodeOffsets[i], decodeScale);
            }
            inputOffset = end;
        }

        // Decode indices.
        var numIndices = str.length - inputOffset;
        var indicesOut = new Uint16Array(numIndices);
        var highest = 0;
        for (var i = 0; i < numIndices; i++) {
            var code = str.charCodeAt(i + inputOffset);
            indicesOut[i] = highest - code;
            if (code == 0) {
                highest++;
            }
        }

        return [attribsOut, indicesOut];
    }

    sh.util.decompressSimpleMesh = decompressSimpleMesh;
})();if(typeof module !== 'undefined') { module.exports = sh; }
