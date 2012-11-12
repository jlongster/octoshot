
var SceneNode = Obj.extend({
    init: function(pos, rot, scale) {
        this.pos = pos;
        this.rot = rot && quat4.fromAngleAxis.apply(null, rot);
        this.scale = scale;
        this.globalTransform = mat4.create();

        this.children = [];
        this.program = getProgram('default');
        this._dirty = true;
        this.type = 'node';
    },

    addObject: function(obj) {
        obj._parent = this;
        this.children.push(obj);
    },

    setPos: function(pos) {
        this.pos = pos;
        this._dirty = true;
    },

    setRot: function(rot) {
        this.rot = rot;
        this._dirty = true;
    },

    setScale: function(scale) {
        this.scale = scale;
        this._dirty = true;
    },

    prerender: function() {
        var parent = this._parent;

        if(this._dirty) {
            this.transform = mat4.create();
            mat4.identity(this.transform);

            if(this.pos) {
                mat4.translate(this.transform, this.pos);
            }

            if(this.rot) {
                mat4.multiply(this.transform, quat4.toMat4(this.rot));
            }

            if(this.scale) {
                mat4.scale(this.transform, this.scale);
            }

            if(parent) {
                mat4.multiply(parent.globalTransform,
                              this.transform,
                              this.globalTransform);
            }
            else {
                this.globalTransform = this.transform;
            }

            this._dirty = false;
        }

        gl.useProgram(this.program);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "transform"),
                            false,
                            this.globalTransform);
    },

    render: function() {
    },

    update: function() {
    }
});
