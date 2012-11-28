(function() {

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
        for(var i=0, l=this.children.length; i<l; i++) {
            func(this.children[i]);
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