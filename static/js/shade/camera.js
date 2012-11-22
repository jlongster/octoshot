
sh.Camera = sh.SceneNode.extend({
    init: function(pos) {
        this.parent(pos);
        // Default position should be looking at a positive Z axis
        this.yaw = Math.PI;
        this.pitch = 0.;
        this._dirty = false;
        this._dirtyWorld = true;
        this.useQuat = true;

        var q = quat4.fromAngleAxis(Math.PI, [0, 1, 0]);
        quat4.toMat4(q, this.transform);
    },

    update: function(dt) {
        var moved = this.moved = false;
        var mouse = input.getMouseMoved();
        var yaw = this.yaw;
        var pitch = this.pitch;

        yaw -= mouse[0] * .01;
        pitch -= mouse[1] * .01;

        if(mouse[0] !== 0 || mouse[1] !== 0) {
            moved = true;
        }

        if((input.isDown('LEFT') || input.isDown('a')) && !input.isMouseDown()) {
            yaw += .02;
            moved = true;
        }

        if((input.isDown('RIGHT') || input.isDown('d')) && !input.isMouseDown()) {
            yaw -= .02;
            moved = true;
        }

        this.yaw = yaw;
        this.pitch = Math.max(Math.min(Math.PI / 2.0, pitch), -Math.PI / 2.0);

        var globalQuat = quat4.fromAngleAxis(-this.pitch, [1, 0, 0]);
        quat4.rotateY(globalQuat, -this.yaw);
        quat4.toMat4(globalQuat, this.transform);

        this.quat = quat4.fromAngleAxis(this.pitch, [1, 0, 0]);
        quat4.rotateY(this.quat, this.yaw);

        var forward = vec3.create([0, 0, -1]);
        var left = vec3.create([-1, 0, 0]);
        quat4.multiplyVec3(this.quat, forward);
        quat4.multiplyVec3(this.quat, left);

        vec3.scale(forward, 180*dt, forward);
        vec3.scale(left, 100*dt, left);

        if((input.isDown('LEFT') || input.isDown('a')) && input.isMouseDown()) {
            vec3.add(this.pos, left);
            moved = true;
        }

        if((input.isDown('RIGHT') || input.isDown('d')) && input.isMouseDown()) {
            vec3.subtract(this.pos, left);
            moved = true;
        }

        if(input.isDown('UP') || input.isDown('w')) {
            vec3.add(this.pos, forward);
            moved = true;
        }

        if(input.isDown('DOWN') || input.isDown('s')) {
            vec3.subtract(this.pos, forward);
            moved = true;
        }

        var x = this.pos[0];
        var y = this.pos[1];
        var z = this.pos[2];
        this.pos[1] = Terrain.getHeight(x, z, true) + 20.0;
        mat4.translate(this.transform, [-this.pos[0], -this.pos[1], -this.pos[2]]);

        this._dirtyWorld = moved;
        this.worldTransform = this.transform;

        this.moved = moved;
    },

    updateMatrices: function() {
    },
    
    render: function() {
    }
});
