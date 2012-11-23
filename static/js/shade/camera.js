
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
        this._dirty = true;
        var dirty = this._dirty;
        this.parent();

        if(dirty) {
            mat4.inverse(this._realTransform, this.inverseTransform);
        }
    },
    
    render: function() {
    }
});
