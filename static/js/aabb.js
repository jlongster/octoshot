
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