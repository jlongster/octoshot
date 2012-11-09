
function Camera(pos) {
    this.pos = pos;
    this.pitch = 0.;
    this.yaw = 0.;
}

Camera.prototype.update = function(dt) {
    this.transform = mat4.create();
    mat4.identity(this.transform);

    var mouse = getMouseMoved();
    this.pitch += mouse[0] * .5 * dt;
    this.yaw += mouse[1] * .5 * dt;

    if((isDown('LEFT') || isDown('a')) && !isMouseDown()) {
        this.pitch -= 1 * dt;
    }

    if((isDown('RIGHT') || isDown('d')) && !isMouseDown()) {
        this.pitch += 1 * dt;
    }

    mat4.rotate(this.transform, Math.PI, [0, 1, 0]);
    mat4.rotate(this.transform, -this.yaw, [1, 0, 0]);
    mat4.rotate(this.transform, this.pitch, [0, 1, 0]);

    var forward = vec3.create();
    var side = vec3.create();
    mat4.multiplyVec3(this.transform, [0, 0, -1], forward);
    mat4.multiplyVec3(this.transform, [1, 0, 0], side);
    vec3.scale(forward, 100*dt, forward);
    vec3.scale(side, 100*dt, side);
    forward[0] = -forward[0];
    side[2] = -side[2];

    if((isDown('LEFT') || isDown('a')) && isMouseDown()) {
        var res = vec3.create();
        vec3.subtract(this.pos, side, res);
        this.pos = res;
    }

    if((isDown('RIGHT') || isDown('d')) && isMouseDown()) {
        var res = vec3.create();
        vec3.add(this.pos, side, res);
        this.pos = res;
    }

    if(isDown('UP') || isDown('w')) {
        var res = vec3.create();
        vec3.add(this.pos, forward, res);
        this.pos = res;
    }

    if(isDown('DOWN') || isDown('s')) {
        var res = vec3.create();
        vec3.subtract(this.pos, forward, res);
        this.pos = res;
    }

    if(isDown('SPACE')) {
        renderer.addObject(new Ball());
    }

    var x = this.pos[0];
    var y = this.pos[1];
    var z = this.pos[2];
    this.pos[1] = Terrain.getHeight(x, z, true) + 20.0;
    mat4.translate(this.transform, [-this.pos[0], -this.pos[1], -this.pos[2]]);
};
