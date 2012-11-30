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
        this.colorLoc = this.getUniformLocation("matColor");
        this.textureScaleLoc = this.getUniformLocation("textureScale");
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
        this._gltextures = {};
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
            else if(ext == 'ogg' || ext == 'mp3' || ext == 'wav') {
                loader = this.loadSound;
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

    xhrGet: function(url, then, responseField, responseType) {
        var req = new XMLHttpRequest();
        req.open('GET', url, true);

        req.addEventListener('load', function() {
            if(req.status === 200 || req.status === 0) {
                then(req[responseField || 'responseText']);
            }
            else {
                _this.onFailure(url);
            }
        }, false);

        req.addEventListener('error', function(err) {
            _this.onFailure(url);
        }, false);

        if(responseType) {
            req.responseType = responseType;
        }

        req.send();
    },

    xhrGetBuffer: function(url, then) {
        this.xhrGet(url, then, 'response', 'arraybuffer');
    },

    loadMesh: function(url, attribArrays) {
        this.xhrGet(url, function(src) {
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

        this.xhrGet(url, function(src) {
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

    loadSound: function(url) {
        var _this = this;

        // Argh audio, the scourge of the earth ye
        if('webkitAudioContext' in window) {
            this.xhrGetBuffer(url, function(buffer) {
                _this.onLoaded(url, new sh.WebAudioSound(buffer));
            });
        }
        else {
            // I will plunder ye village and burn ye homes to da ground
            var audio = new Audio();
            var sound;

            if(audio.mozSetup) {
                sound = new sh.AudioDataSound();

                audio.addEventListener('MozAudioAvailable', function(e) {
                    sound.load(e.frameBuffer);
                }, false);

                audio.addEventListener('loadedmetadata', function(e) {
                    sound.setup(audio.mozChannels,
                                audio.mozSampleRate,
                                audio.mozFrameBufferLength);
                }, false);
            }
            else {
                sound = new sh.Sound(audio);
            }

            audio.muted = true;
            audio.src = url;
            audio.play();
            
            // I can't find an event that loads when the sound is
            // fully completed, so just go ahead
            _this.onLoaded(url, sound);
        }
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

    uploadImage: function(img) {
        if(typeof img === 'string') {
            img = this.get(img);
        }

        if(this._gltextures[img.src]) {
            return this._gltextures[img.src];
        }

        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

        this._gltextures[img.src] = tex;
        return tex;
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
});
sh.Collision = {
    boxLineHit: function(ent, lineStart, lineEnd) {
        var aabb = ent.AABB;
        var matInverse = mat4.create();

        mat4.identity(matInverse);
        mat4.translate(matInverse, aabb.getWorldPos());
        mat4.rotateZ(matInverse, ent.rot[2]);
        mat4.rotateY(matInverse, ent.rot[1]);
        mat4.rotateX(matInverse, ent.rot[0]);
        mat4.inverse(matInverse);

        var v1 = vec3.create();
        var v2 = vec3.create();
        mat4.multiplyVec3(matInverse, lineStart, v1);
        mat4.multiplyVec3(matInverse, lineEnd, v2);

        var extent = aabb.extent;
        var lMid = vec3.create();
        vec3.add(v1, v2, lMid);
        vec3.scale(lMid, 0.5);

        var l = vec3.create();
        vec3.subtract(v1, lMid, l);

        var lExt = vec3.createFrom(Math.abs(l[0]),
                                   Math.abs(l[1]),
                                   Math.abs(l[2]));

        if(Math.abs(lMid[0]) > extent[0] + lExt[0]) {
            return false;
        }
        else if(Math.abs(lMid[1]) > extent[1] + lExt[1]) {
            return false;
        }
        else if(Math.abs(lMid[2]) > extent[2] + lExt[2]) {
            return false;
        }
        
        vec3.cross(lMid, l);

        var r = extent[1] * lExt[2] + extent[2] * lExt[1];
        if(Math.abs(lMid[0]) > r) {
            return false;
        }
        
        r = extent[0] * lExt[2] + extent[2] * lExt[0];
        if(Math.abs(lMid[1]) > r) {
            return false;
        }

        r = extent[0] * lExt[1] + extent[1] * lExt[0];
        if(Math.abs(lMid[2]) > r) {
            return false;
        }

        // WHY WON'T THIS WORK?? T_T
        // EDIT: IT FINALLY WORKSSSSSSS!
        return true;
    },

    boxContainsPoint: function(aabb, point) {
        var worldPos = aabb.getWorldPos();

        var upper = vec3.create();
        vec3.add(worldPos, aabb.extent, upper);

        var lower = vec3.create();
        vec3.subtract(worldPos, aabb.extent, lower);

        if(upper[0] >= point[0] &&
           lower[0] <= point[0] &&
           upper[1] >= point[1] &&
           lower[1] <= point[1] &&
           upper[2] >= point[2] &&
           lower[2] <= point[2]) {
            return true;
        }

        return false;
    },

    frustumContainsPoint: function(mat, vec) {
        var clip = vec4.createFrom(vec[0], vec[1], vec[2], 1.0);
        mat4.multiplyVec4(mat, clip);

        return (Math.abs(clip[0]) < clip[3] &&
                Math.abs(clip[1]) < clip[3] &&
                0 < clip[2] &&
                clip[2] < clip[3]);
    },

    frustumContainsPointWhoTheEffCaresAboutTheYAxis: function(mat, vec) {
        var clip = vec4.createFrom(vec[0], vec[1], vec[2], 1.0);
        mat4.multiplyVec4(mat, clip);

        // Don't test the Y. We just want to clip X and Z
        return (Math.abs(clip[0]) < clip[3] &&
                0 < clip[2] &&
                clip[2] < clip[3]);
    },

    boxOverlaps: function(aabb1, aabb2) {
        var worldPos1 = aabb1.getWorldPos();
        var worldPos2 = aabb2.getWorldPos();

        var ab = vec3.create();
        vec3.subtract(worldPos2, worldPos1, ab);

        return (Math.abs(ab[0]) <= (aabb1.extent[0] + aabb2.extent[0]) &&
                Math.abs(ab[1]) <= (aabb1.extent[1] + aabb2.extent[1]) &&
                Math.abs(ab[2]) <= (aabb1.extent[2] + aabb2.extent[2]));
    },

    resolveBoxes: function(aabb1, aabb2) {
        var worldPos1 = aabb1.getWorldPos();
        var worldPos2 = aabb2.getWorldPos();

        var ab = vec3.create();
        vec3.subtract(worldPos2, worldPos1, ab);

        var f1 = aabb1.extent[0] + aabb2.extent[0] - Math.abs(ab[0]);
        var f2 = aabb1.extent[1] + aabb2.extent[1] - Math.abs(ab[1]);
        var f3 = aabb1.extent[2] + aabb2.extent[2] - Math.abs(ab[2]);

        if(f1 < f2 && f1 < f3) {
            if(ab[0] > 0) {
                return [-f1, 0, 0];
            }
            else {
                return [f1, 0, 0];
            }
        }
        else if(f2 < f1 && f2 < f3) {
            if(ab[1] > 0) {
                return [0, -f2, 0];
            }
            else {
                return [0, f2, 0];
            }
        }
        else if(f3 < f1 && f3 < f2) {
            if(ab[2] > 0) {
                return [0, 0, -f3];
            }
            else {
                return [0, 0, f3];
            }
        }
    },

    STATIC: 1,
    ACTIVE: 2,
    NONE: 3
};
sh.AABB = sh.Obj.extend({
    init: function(pos, extent, refEntity) {
        this.pos = pos;
        this.extent = extent;
        this.refEntity = refEntity;
        this._dirty = false;

        this.worldPos = vec3.create();
        if(refEntity) {
            vec3.add(refEntity.pos, this.pos, this.worldPos);
        }
        else {
            vec3.set(this.pos, this.worldPos);
        }
    },

    getWorldPos: function() {
        if(this._dirty) {
            vec3.add(this.refEntity.pos, this.pos, this.worldPos);
        }

        return this.worldPos;
    },

    getPoints: function() {
        var p = this.getWorldPos();
        var extX = this.extent[0];
        var extY = this.extent[1];
        var extZ = this.extent[2];

        return [
            [p[0] + extX, p[1] + extY, p[2] + extZ],
            [p[0] - extX, p[1] + extY, p[2] + extZ],
            [p[0] + extX, p[1] + extY, p[2] - extZ],
            [p[0] - extX, p[1] + extY, p[2] - extZ]

            [p[0] + extX, p[1] - extY, p[2] + extZ],
            [p[0] - extX, p[1] - extY, p[2] + extZ],
            [p[0] + extX, p[1] - extY, p[2] - extZ],
            [p[0] - extX, p[1] - extY, p[2] - extZ]
        ];
    },

    render: function(program) {
        var mat = mat4.create();
        var pos = vec3.create();
        var scale = vec3.create();

        vec3.set(this.getWorldPos(), pos);
        vec3.subtract(pos, this.extent);

        vec3.scale(this.extent, 2.0, scale);

        mat4.identity(mat);
        mat4.translate(mat, pos);
        mat4.scale(mat, scale);

        gl.uniformMatrix4fv(program.modelTransformLoc, false, mat);
        sh.Cube.mesh.render(program.program, true);
    }
});
sh.Quadtree = sh.Obj.extend({
    init: function(aabb, capacity, depth) {
        this.AABB = aabb;
        this.capacity = capacity;
        this.objects = [];
        this.children = null;
        this.depth = depth || 0;
    },

    add: function(entity) {
        if(entity.AABB) {
            if(sh.Collision.boxOverlaps(this.AABB, entity.AABB)) {
                this._add(entity);
            }
        }
    },

    remove: function(entity) {
        if(this.children) {
            var children = this.children;
            for(var i=0, l=children.length; i<l; i++) {
                children[i].remove(entity);
            }
        }
        else {
            var idx = this.objects.indexOf(entity);
            if(idx !== -1) {
                this.objects.splice(idx, 1);
            }
        }
    },

    findObjects: function(aabb, func) {
        if(sh.Collision.boxOverlaps(this.AABB, aabb)) {
            if(this.children) {
                var children = this.children;
                for(var i=0, l=children.length; i<l; i++) {
                    children[i].findObjects(aabb, func);
                }
            }
            else {
                var obj = this.objects;
                for(var i=0, l=obj.length; i<l; i++) {
                    func(obj[i]);
                }
            }
        }
    },

    findObjectsInFrustum: function(frustum, cameraPoint, func) {
        // Forcefully render the first two levels
        if(this.depth < 2) {
            this._findObjectsInFrustum(frustum, cameraPoint, func);
        }

        var v = vec3.create();
        var aabb = this.AABB;
        var pos = aabb.getWorldPos();
        var extent = vec3.create();
        vec3.set(aabb.extent, extent);

        var inside = sh.Collision.frustumContainsPointWhoTheEffCaresAboutTheYAxis;

        vec3.add(pos, extent, v);
        if(inside(frustum, v)) {
            this._findObjectsInFrustum(frustum, cameraPoint, func);
            return;
        }

        extent[0] = -extent[0];
        vec3.add(pos, extent, v);
        if(inside(frustum, v)) {
            this._findObjectsInFrustum(frustum, cameraPoint, func);
            return;
        }

        extent[2] = -extent[2];
        vec3.add(pos, extent, v);
        if(inside(frustum, v)) {
            this._findObjectsInFrustum(frustum, cameraPoint, func);
            return;
        }

        extent[0] = -extent[0];
        vec3.add(pos, extent, v);
        if(inside(frustum, v)) {
            this._findObjectsInFrustum(frustum, cameraPoint, func);
            return;
        }

        extent[1] = -extent[1];
        extent[2] = -extent[2];

        vec3.add(pos, extent, v);
        if(inside(frustum, v)) {
            this._findObjectsInFrustum(frustum, cameraPoint, func);
            return;
        }

        extent[0] = -extent[0];
        vec3.add(pos, extent, v);
        if(inside(frustum, v)) {
            this._findObjectsInFrustum(frustum, cameraPoint, func);
            return;
        }

        extent[2] = -extent[2];
        vec3.add(pos, extent, v);
        if(inside(frustum, v)) {
            this._findObjectsInFrustum(frustum, cameraPoint, func);
            return;
        }

        extent[0] = -extent[0];
        vec3.add(pos, extent, v);
        if(inside(frustum, v)) {
            this._findObjectsInFrustum(frustum, cameraPoint, func);
            return;
        }

        // Always render the box that the player is standing in
        if(sh.Collision.boxContainsPoint(this.AABB, cameraPoint)) {
            this._findObjectsInFrustum(frustum, cameraPoint, func);
        }
    },

    _findObjectsInFrustum: function(frustum, cameraPoint, func) {
        if(this.children) {
            var children = this.children;
            for(var i=0, l=children.length; i<l; i++) {
                children[i].findObjectsInFrustum(frustum, cameraPoint, func);
            }
        }
        else {
            var objs = this.objects;
            for(var i=0, l=objs.length; i<l; i++) {
                func(objs[i]);
            }
        }
    },

    _add: function(entity) {
        if(this.children) {
            for(var i=0; i<this.children.length; i++) {
                this.children[i].add(entity);
            }
        }
        else {
            if(this.objects.length > this.capacity && this.depth < 5) {
                this.subdivide();
                this._add(entity);
            }
            else {
                this.objects.push(entity);
            }
        }
    },

    subdivide: function() {
        var aabb = this.AABB;
        var extent = vec3.create();
        vec3.set(aabb.extent, extent);
        extent[0] *= .5;
        extent[2] *= .5;

        this.children = [];

        // Yackity yuck yuck
        var pos = vec3.create(aabb.pos);
        pos[0] -= extent[0];
        pos[2] -= extent[2];
        this.children.push(new sh.Quadtree(
            new sh.AABB(pos, extent),
            this.capacity,
            this.depth + 1
        ));

        pos = vec3.create(aabb.pos);
        pos[0] += extent[0];
        pos[2] -= extent[2];
        this.children.push(new sh.Quadtree(
            new sh.AABB(pos, extent),
            this.capacity,
            this.depth + 1
        ));

        pos = vec3.create(aabb.pos);
        pos[0] -= extent[0];
        pos[2] += extent[2];
        this.children.push(new sh.Quadtree(
            new sh.AABB(pos, extent),
            this.capacity,
            this.depth + 1
        ));

        pos = vec3.create(aabb.pos);
        pos[0] += extent[0];
        pos[2] += extent[2];
        this.children.push(new sh.Quadtree(
            new sh.AABB(pos, extent),
            this.capacity,
            this.depth + 1
        ));

        for(var i=0; i<this.objects.length; i++) {
            this._add(this.objects[i]);
        }

        this.objects = [];
    },

    render: function(program) {
        this.AABB.render(program);

        if(this.children) {
            for(var i=0; i<this.children.length; i++) {
                this.children[i].render(program);
            }
        }
    }
});
sh.Scene = sh.Obj.extend({
    init: function(sceneWidth, sceneDepth) {
        this.root = new sh.SceneNode();
        this.root.AABB = null;
        this.overlayRoot = new sh.SceneNode();

        this._objectsById = {};
        this._behaviors = [];
        this._entities = [];
        this.sceneWidth = sceneWidth;
        this.sceneDepth = sceneDepth;
        this.useQuadtree = true;

        this._quadtree = new sh.Quadtree(
            new sh.AABB(vec3.createFrom(sceneWidth / 2.0, 50, sceneDepth / 2.0),
                        vec3.createFrom(sceneWidth / 2.0, 50, sceneDepth / 2.0)),
            8
        );

        var _this = this;

        function addObj(obj) {
            if(obj.id) {
                _this._objectsById[obj.id] = obj;
            }

            if(obj.isEntity) {
                var idx = _this._entities.indexOf(obj);
                if(idx === -1) {
                    _this._entities.push(obj);
                }
            }

            _this._quadtree.add(obj);

            for(var i=0, l=obj.children.length; i<l; i++) {
                addObj(obj.children[i]);
            }
        }
        sh.SceneNode.onAdd(addObj);

        function removeObj(obj) {
            if(obj.id) {
                _this._objectsById[obj.id] = null;
            }

            if(obj.isEntity) {
                var idx = _this._entities.indexOf(obj);
                if(idx !== -1) {
                    _this._entities.splice(idx, 1);
                }
            }

            _this._quadtree.remove(obj);

            for(var i=0, l=obj.children.length; i<l; i++) {
                removeObj(obj.children[i]);
            }
        }
        sh.SceneNode.onRemove(removeObj);
    },

    addObject: function(obj) {
        this.root.addObject(obj);
    },

    add2dObject: function(obj) {
        this.overlayRoot.addObject(obj);
    },

    getCamera: function() {
        return this.camera;
    },

    setCamera: function(camera) {
        this.camera = camera;
    },

    getOverlay: function() {
        return this.overlayRoot;
    },

    addBehavior: function(obj) {
        this._behaviors.push(obj);
    },

    getObject: function(id) {
        return this._objectsById[id];
    },

    findNearbyObjects: function(aabb, func) {
        this._quadtree.findObjects(aabb, func);
    },

    traverse: function(func) {
        this.root.traverse(func);
    },

    checkCollisions: function(node) {
        node = node || this.root;

        if(node.collisionType === sh.Collision.ACTIVE) {
            this.checkObjCollisions(node);
        }

        var children = node.children;
        for(var i=0, l=children.length; i<l; i++) {
            this.checkCollisions(children[i]);
        }
    },

    checkObjCollisions: function(obj) {
        if(obj.AABB) {
            this.findNearbyObjects(
                obj.AABB,
                function(obj2) {
                    if(obj != obj2 &&
                       obj2.collisionType != sh.Collision.NONE &&
                       sh.Collision.boxOverlaps(obj.AABB, obj2.AABB)) {
                        var b = sh.Collision.resolveBoxes(obj.AABB, obj2.AABB);
                        obj.translate(b[0], b[1], b[2]);
                    }
                }
            );
        }
    },

    fillQueue: function(arr, cameraPoint, frustum) {
        if(this.useQuadtree) {
            var sky = this.getObject('sky');
            if(sky) {
                arr.push(sky);
            }

            this._quadtree.findObjectsInFrustum(frustum, cameraPoint, function(obj) {
                if(arr.indexOf(obj) === -1) {
                    arr.push(obj);
                }
            });

            var ents = this._entities;
            for(var i=0; i<ents.length; i++) {
                // Just go ahead and render all the entities, damnit
                ents[i].traverse(function(obj) {
                    arr.push(obj);
                });
            }
        }
        else {
            this.root.traverse(function(obj) {
                arr.push(obj);
            });
        }
    },

    update: function(dt) {
        this.updateObject(this.root, dt);
        this.updateObject(this.overlayRoot, dt);

        for(var i=0, l=this._behaviors.length; i<l; i++) {
            this._behaviors[i].update(dt);
        }

        this.checkCollisions();
        this.camera.updateMatrices();
    },

    updateObject: function(obj, dt, force) {
        obj.update(dt);

        var dirty = obj.needsWorldUpdate();
        obj.updateMatrices(force);

        var children = obj.children;
        for(var i=0, l=children.length; i<l; i++) {
            this.updateObject(children[i], dt, dirty || force);
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

        this.pos = (pos && vec3.create(pos)) || vec3.createFrom(0, 0, 0);
        this.rot = (rot && vec3.create(rot)) || vec3.createFrom(0, 0, 0);
        this.scale = (scale && vec3.create(scale)) || vec3.createFrom(1, 1, 1);
        this.transform = mat4.create();
        this.worldTransform = mat4.create();
        this._program = null;
        this.setAABB();
        this.collisionType = sh.Collision.NONE;

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

    setAABB: function(pos, extent) {
        if(!extent) {
            extent = vec3.create();
            vec3.scale(this.scale, .5, extent);
        }

        if(!pos) {
            // Default is in the middle of the object
            pos = vec3.create();
            vec3.set(extent, pos);
        }

        this.AABB = new sh.AABB(pos, extent, this);
    },

    setPos: function(x, y, z) {
        this.pos[0] = x;
        this.pos[1] = y;
        this.pos[2] = z;
        this._dirty = true;
        if(this.AABB) {
            this.AABB._dirty = true;
        }
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
        if(this.AABB) {
            this.AABB._dirty = true;
        }
    },

    translateX: function(v) {
        this.pos[0] += v;
        this._dirty = true;
        if(this.AABB) {
            this.AABB._dirty = true;
        }
    },

    translateY: function(v) {
        this.pos[1] += v;
        this._dirty = true;
        if(this.AABB) {
            this.AABB._dirty = true;
        }
    },

    translateZ: function(v) {
        this.pos[2] += v;
        this._dirty = true;
        if(this.AABB) {
            this.AABB._dirty = true;
        }
    },

    rotate: function(x, y, z) {
        this.rot[0] += x;
        this.rot[1] += y;
        this.rot[2] += z;
        this._dirty = true;
    },

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
        quat4.rotateX(quat, this.rot[0]);
        quat4.multiplyVec3(quat, forward);
        vec3.scale(forward, v);
        this.translate(forward[0], forward[1], forward[2]);
    },

    moveBack: function(v) {
        var back = vec3.create([0, 0, 1]);
        var quat = quat4.fromAngleAxis(this.rot[1], [0, 1, 0]);
        quat4.rotateX(quat, this.rot[0]);
        quat4.multiplyVec3(quat, back);
        vec3.scale(back, v);
        this.translate(back[0], back[1], back[2]);
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
                mat4.scale(this.transform, this.scale);
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

        // Texture coords

        this.texBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);

        var coords = [
            // front
            1, 1/6,
            0, 1/6,
            0, 0,
            1, 0,
 
            // left
            1, 2/6,
            0, 2/6,
            0, 1/6,
            1, 1/6,

            // right
            1, 3/6,
            0, 3/6,
            0, 2/6,
            1, 2/6,

            // back
            1, 4/6,
            0, 4/6,
            0, 3/6,
            1, 3/6,

            // top
            1, 5/6,
            0, 5/6,
            0, 4/6,
            1, 4/6,

            // bottom
            1, 1,
            0, 1,
            0, 5/6,
            1, 5/6
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coords), gl.STATIC_DRAW);
        
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
        renderer.bindAndEnableBuffer(program, this.texBuffer, 'a_texcoord', 2);

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

        if(typeof window !== 'undefined' && !sh.Cube.mesh) {
            sh.Cube.mesh = new sh.CubeMesh();
            sh.Cube.mesh.create();
        }
    },

    setImage: function(img, smooth) {
        this.tex = resources.uploadImage(img);

        if(smooth) {
            gl.bindTexture(gl.TEXTURE_2D, this.tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    },

    render: function() {
        if(this.tex) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.tex);

            var sampleLoc = this._program.getUniformLocation('sampler');
            if(sampleLoc) {
                gl.uniform1i(sampleLoc, 0);
            }

            if(this.textureScale && this._program.textureScaleLoc) {
                gl.uniform2fv(this._program.textureScaleLoc, this.textureScale);
            }
        }

        // TODO: don't dig into the program object like this
        sh.Cube.mesh.render(this._program.program, this.wireframe);
    }
});

sh.Camera = sh.SceneNode.extend({
    init: function(target) {
        this.parent();
        this.target = target;
        this.inverseTransform = mat4.create();
    },

    updateMatrices: function() {
        this.target.updateMatrices();
        mat4.inverse(this.target._realTransform, this.inverseTransform);
    }
});

sh.Renderer = sh.Obj.extend({
    init: function(w, h) {
        this.persMatrix = mat4.create();
        this.orthoMatrix = mat4.create();
        this.resizeFuncs = [];
        this.resize(w, h);

        this._objects = [];
        this._bufferCache = {};
        this._programCache = {};

        this._normalMatrix = mat3.create();
        this._worldTransform = mat4.create();

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        var _this = this;
    },

    resize: function(w, h) {
        this.width = w;
        this.height = h;

        mat4.ortho(0, this.width, this.height, 0, -1, 1, this.orthoMatrix);

        this.resizeFuncs.forEach(function(func) {
            func(w, h);
        });
    },

    onResize: function(func) {
        this.resizeFuncs.push(func);
    },

    perspective: function(fov, ratio, near, far) {
        mat4.perspective(fov, ratio, near, far, this.persMatrix);
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

    render: function(scene) {
        if(!scene.camera) {
            return;
        }

        mat4.multiply(this.persMatrix,
                      scene.camera.inverseTransform,
                      this._worldTransform);

        this._objects = [];
        scene.fillQueue(this._objects,
                        scene.camera.target.pos,
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

                if(prog.colorLoc) {
                    if(obj.color) {
                        gl.uniform3fv(prog.colorLoc, obj.color);
                    }
                    else {
                        gl.uniform3f(prog.colorLoc, 0, 0, 0);
                    }
                }

                if(obj.blend) {
                    gl.enable(gl.BLEND);
                    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                }

                if(obj.backface) {
                    gl.disable(gl.CULL_FACE);
                }

                if(obj.noZbuffer) {
                    gl.disable(gl.DEPTH_TEST);
                }

                obj.render();

                if(obj.noZbuffer) {
                    gl.enable(gl.DEPTH_TEST);
                }

                if(obj.backface) {
                    gl.enable(gl.CULL_FACE);
                }

                if(obj.blend) {
                    gl.disable(gl.BLEND);
                }
            }
        }

        // Render AABBs (DEBUG)

        // var prog = this.loadProgram({ shaders: ['debug.vsh', 'debug.fsh'] });
        // prog.use();
        // if(prog.worldTransformLoc) {
        //     gl.uniformMatrix4fv(prog.worldTransformLoc,
        //                         false,
        //                         this._worldTransform);
        // }

        // for(var i=0, l=objs.length; i<l; i++) {
        //     if(objs[i].AABB) {
        //         objs[i].AABB.render(prog);
        //     }
        // }

        // Render Quadtree (DEBUG)

        //scene._quadtree.render(prog);
    },

    render2d: function(node) {
        var lastProg = null;
        var _this = this;

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        node.traverse(function(obj) {
            if(!obj._program) {
                obj._program = _this.loadProgram(obj);
            }

            var prog = obj._program;

            if(prog) {
                if(!lastProg || lastProg != prog) {
                    prog.use();
                    lastProg = prog;

                    if(prog.worldTransformLoc) {
                        gl.uniformMatrix4fv(prog.worldTransformLoc,
                                            false,
                                            _this.orthoMatrix);
                    }
                }
            }

            gl.uniformMatrix4fv(prog.modelTransformLoc,
                                false,
                                obj._realTransform);

            obj.render();
        });

        gl.disable(gl.BLEND);
    },

    bindAndEnableBuffer: function(program, buf, attrib, numElements) {
        //if(this._bufferCache[attrib] != buf) {
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            var loc = gl.getAttribLocation(program, attrib);
            if(loc != -1) {
                gl.enableVertexAttribArray(loc);
                gl.vertexAttribPointer(loc, numElements || 3, gl.FLOAT, false, 0, 0);
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
})();


// var DEFAULT_ATTRIB_ARRAYS = [
//   { name: "a_position",
//     size: 3,
//     stride: 8,
//     offset: 0,
//     decodeOffset: -4095,
//     decodeScale: 1/8191
//   },
//   { name: "a_texcoord",
//     size: 2,
//     stride: 8,
//     offset: 3,
//     decodeOffset: 0,
//     decodeScale: 1/1023
//   },
//   { name: "a_normal",
//     size: 3,
//     stride: 8,
//     offset: 3,
//     decodeOffset: -511,
//     decodeScale: 1/1023
//   }
// ];
if(typeof module !== 'undefined') { module.exports = sh; }
