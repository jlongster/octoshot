
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