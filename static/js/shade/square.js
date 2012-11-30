
sh.SquareMesh = sh.Obj.extend({
    create: function() {
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

        var vertices = [
            0, 0, 0,
            0, 1, 0,
            1, 1, 0,

            0, 0, 0,
            1, 1, 0,
            1, 0, 0
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        this.texBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);

        var coords = [
            0, 0,
            0, 1,
            1, 1,

            0, 0,
            1, 1,
            1, 0
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coords), gl.STATIC_DRAW);
    },

    render: function(program) {
        renderer.bindAndEnableBuffer(program, this.vertexBuffer, 'a_position');
        renderer.bindAndEnableBuffer(program, this.texBuffer, 'a_texcoord', 2);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
});

sh.Square = sh.SceneNode.extend({
    init: function(pos, rot, scale) {
        this.parent(pos, rot, scale);
        this.AABB = null;

        if(!sh.Square.mesh) {
            sh.Square.mesh = new sh.SquareMesh();
            sh.Square.mesh.create();
        }
    },

    setImage: function(img) {
        this.tex = resources.uploadImage(img);
    },

    render: function() {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.tex);
        var sampleLoc = this._program.getUniformLocation('sampler');
        if(!sampleLoc != -1) {
            gl.uniform1i(sampleLoc, 0);
        }

        // TODO: don't dig into the program object like this
        sh.Square.mesh.render(this._program.program);
    }
});