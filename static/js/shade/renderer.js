
sh.Renderer = sh.Obj.extend({
    init: function() {
        this.root = null;


        this._objects = [];
        this._objectsById = {};
        this._bufferCache = {};
        this._normalMatrix = mat3.create();

        sh.Shaders.createProgram('default',
                                 sh.Shaders.getShader('default-vertex'),
                                 sh.Shaders.getShader('default-fragment'));

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

    setRoot: function(obj) {
        this.root = obj;
    },

    getObject: function(id) {
        return this._objectsById[id];
    },

    update: function(dt) {
        this.updateObject(this.root, dt);
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

    render: function() {
        var objs = this._objects;
        var lastProg = null;

        for(var i=0, l=objs.length; i<l; i++) {
            var obj = objs[i];

            if(obj.program && !lastProg || lastProg != obj.program) {
                gl.useProgram(obj.program);
                lastProg = obj.program;
            }

            gl.uniformMatrix4fv(obj.transformLoc,
                                false,
                                obj._realTransform);

            if(obj.normalLoc) {
                mat4.toInverseMat3(obj._realTransform, this._normalMatrix);
                mat3.transpose(this._normalMatrix);
                
                gl.uniformMatrix3fv(obj.normalLoc,
                                    false,
                                    this._normalMatrix);
            }

            obj.render();
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