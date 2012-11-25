
var Player = Entity.extend({
    init: function(opts) {
        this.parent(opts.pos, opts.rot, opts.scale);
        this.camera = camera;
        this.speed = 100;
        this.lastState = {};

        camera.pos[1] = Terrain.getHeight(camera.pos[0], camera.pos[2], true) + 20.0;
    },

    update: function(dt) {
        var camera = this.camera;
        var mouse = input.getMouseMoved();
        this.lastState = {};

        if(mouse[0] !== 0 || mouse[1] !== 0) {
            camera.rotateX(mouse[1] * -.01);
            camera.rotateY(mouse[0] * -.01);
        }

        if((input.isDown('LEFT') || input.isDown('a'))) {
            if(input.isMouseDown()) {
                camera.moveLeft(this.speed * dt);
            }
            else {
                camera.rotateY(.02);
            }

            this.lastState.left = this.speed * dt;
        }

        if((input.isDown('RIGHT') || input.isDown('d'))) {
            if(input.isMouseDown()) {
                camera.moveRight(this.speed * dt);
            }
            else {
                camera.rotateY(-.02);
            }
        }

        if(input.isDown('UP') || input.isDown('w')) {
            camera.moveForward(this.speed * dt);
        }

        if(input.isDown('DOWN') || input.isDown('s')) {
            camera.moveBack(this.speed * dt);
        }

        camera.rot[0] = Math.max(Math.min(Math.PI / 2.0,
                                          camera.rot[0]),
                                 -Math.PI / 2.0);
        camera.pos[1] = Terrain.getHeight(camera.pos[0], camera.pos[2], true) + 20.0;

        if(camera.needsWorldUpdate()) {
            server.sendState(camera);
        }
    }
});