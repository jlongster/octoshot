
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

    angle *= 0.5;

    quat4.multiply(quat,
                   [0, Math.sin(angle), 0, Math.cos(angle)],
                   dest);
};

var Camera = SceneNode.extend({
    init: function(pos) {
        this.parent(pos);
        // Default position should be looking at a positive Z axis
        this.yaw = Math.PI;
        this.pitch = 0.;
    },

    update: function(dt) {
        this.transform = mat4.create();

        var mouse = getMouseMoved();
        this.yaw -= mouse[0] * .25 * dt;
        this.pitch -= mouse[1] * .25 * dt;

        if((isDown('LEFT') || isDown('a')) && !isMouseDown()) {
            this.yaw += 1 * dt;
        }

        if((isDown('RIGHT') || isDown('d')) && !isMouseDown()) {
            this.yaw -= 1 * dt;
        }

        // TODO: optimize this
        var globalQuat = quat4.fromAngleAxis(-this.pitch, [1, 0, 0]);
        quat4.rotateY(globalQuat, -this.yaw);
        quat4.toMat4(globalQuat, this.transform);

        this.rot = quat4.fromAngleAxis(this.pitch, [1, 0, 0]);
        quat4.rotateY(this.rot, this.yaw);

        var forward = vec3.create([0, 0, -1]);
        var left = vec3.create([-1, 0, 0]);
        quat4.multiplyVec3(this.rot, forward);
        quat4.multiplyVec3(this.rot, left);

        vec3.scale(forward, 180*dt, forward);
        vec3.scale(left, 100*dt, left);

        if((isDown('LEFT') || isDown('a')) && isMouseDown()) {
            vec3.add(this.pos, left);
        }

        if((isDown('RIGHT') || isDown('d')) && isMouseDown()) {
            vec3.subtract(this.pos, left);
        }

        if(isDown('UP') || isDown('w')) {
            vec3.add(this.pos, forward);
        }

        if(isDown('DOWN') || isDown('s')) {
            vec3.subtract(this.pos, forward);
        }

        var x = this.pos[0];
        var y = this.pos[1];
        var z = this.pos[2];
        this.pos[1] = Terrain.getHeight(x, z, true) + 20.0;
        mat4.translate(this.transform, [-this.pos[0], -this.pos[1], -this.pos[2]]);

        this._dirty = true;
        this.globalTransform = this.transform;
    },

    prerender: function() {
    },
    
    render: function() {
    }
});
