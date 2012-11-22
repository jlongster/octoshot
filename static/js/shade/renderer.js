
sh.Renderer = sh.Obj.extend({
    init: function() {
        this.root = null;
        this.persMatrix = mat4.create();

        this._objects = [];
        this._objectsById = {};
        this._bufferCache = {};
        this._normalMatrix = mat3.create();
        this._programCache = {};

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

    setRoot: function(obj) {
        this.root = obj;
    },

    getObject: function(id) {
        return this._objectsById[id];
    },

    perspective: function(fov, ratio, near, far) {
        mat4.perspective(fov, ratio, near, far, this.persMatrix);
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

    loadProgram: function(obj) {
        if('shaders' in obj) {
            // Copy the shader array and sort it
            var sorted = obj.shaders.slice(0);
            sorted.sort();

            // If a program with the same shaders already exists, use it
            var cacheKey = sorted.join(';');
            if(this._programCache[cacheKey]) {
                return this._programCache[cacheKey];
            }

            var program = new sh.Program(sorted);

            // Set the perspective matrix
            var persLoc = program.getUniformLocation('pers');
            gl.uniformMatrix4fv(persLoc, false, this.persMatrix);

            this._programCache[cacheKey] = program;
            return program;
        }

        return null;
    },

    render: function() {
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
                }

                gl.uniformMatrix4fv(prog.transformLoc,
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