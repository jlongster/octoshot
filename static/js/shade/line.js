
sh.LineMesh = sh.Obj.extend({
    create: function() {
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

        var vertices = new Float32Array(6);
        vertices[0] = 0.0;
        vertices[1] = 0.0;
        vertices[2] = 0.0;

        vertices[3] = 0.0;
        vertices[4] = 0.0;
        vertices[5] = -1.0;

        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    },

    render: function(program) {
        renderer.bindAndEnableBuffer(program, this.vertexBuffer, 'a_position');
        gl.drawArrays(gl.LINES, 0, 2);
    }
});

sh.Line = sh.SceneNode.extend({
    init: function(opts) {
        this.parent(opts.pos, opts.rot, opts.scale);

        if(opts.v1 && opts.v2) {
            vec3.set(opts.v1, this.pos);
            var vec = vec3.create();
            vec3.subtract(opts.v2, opts.v1, vec);

            var matTmp = mat4.create();
            var mat = mat3.create();
            mat4.lookAt([0, 0, 0], vec, [0, 1, 0], matTmp);
            mat4.toMat3(matTmp, mat);

            quat4.fromRotationMatrix(mat, this.quat);
            this.useQuat = true;

            var len = vec3.length(vec);
            this.scale[2] = len;
        }

        if(!sh.Line.mesh) {
            sh.Line.mesh = new sh.LineMesh();
            sh.Line.mesh.create();
        }
    },

    render: function() {
        // TODO: don't dig into the program object like this
        sh.Line.mesh.render(this._program.program);
    }
});