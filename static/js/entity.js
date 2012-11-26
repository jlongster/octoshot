
(function(SceneNode, Terrain, packets, vec3) {

    var Entity = SceneNode.extend({
        init: function(opts) {
            opts = opts || {};
            this.parent(opts.pos, opts.rot, opts.scale);
            this.speed = opts.speed || 100;

            this.sequenceId = 0;
            this.pos[1] = Terrain.getHeight(this.pos[0], this.pos[2], true) + 20.0;

            // Initially turn them around to face the positive Z axis.
            if(!opts.rot) {
                this.rotateY(Math.PI);
            }

            this.startPos = vec3.create(this.pos);
            this.startRot = vec3.create(this.rot);
            this.targetPos = vec3.create();
            this.targetRot = vec3.create();
            this.interp = 5000.0;

            this.stateBuffer = [];
            this.packetBuffer = [];
        },

        handleServerInput: function(state) {
            // Run the entity's movement on the server-side.

            var dt = state.dt;
            var diffPos = vec3.create();
            vec3.set(this.pos, diffPos);
            var diffRot = vec3.create();
            vec3.set(this.rot, diffRot);

            this.rotateX(state.mouseY * -.01);
            this.rotateY(state.mouseX * -.01);

            if(state.left) {
                if(state.mouseDown) {
                    this.moveLeft(this.speed * dt);
                }
                else {
                    this.rotateY(.02);
                }
            }

            if(state.right) {
                if(state.mouseDown) {
                    this.moveRight(this.speed * dt);
                }
                else {
                    this.rotateY(-.02);
                }
            }

            if(state.up) {
                this.moveForward(this.speed * dt);
            }

            if(state.down) {
                this.moveBack(this.speed * dt);
            }

            this.pos[1] = Terrain.getHeight(this.pos[0], this.pos[2], true) + 20.0;

            vec3.subtract(this.pos, diffPos, diffPos);
            vec3.subtract(this.rot, diffRot, diffRot);
            this.sendInput(diffPos, diffRot, state.sequenceId);
        },

        sendInput: function(diffPos, diffRot, id) {
            var obj = {
                type: packets.statePacket.typeId,
                from: 0,
                sequenceId: id,
                x: diffPos[0],
                y: diffPos[1],
                z: diffPos[2],
                rotX: diffRot[0],
                rotY: diffRot[1],
                rotZ: diffRot[2]
            };

            this.packetBuffer.push(obj);
        },

        flushPackets: function() {
            var tmp = this.packetBuffer;
            this.packetBuffer = [];
            return tmp;
        },

        update: function(dt) {
            if(this.interp < 1) {
                this.interp += dt / .1;
                vec3.lerp(this.startPos, this.targetPos, this.interp, this.pos);
                vec3.lerp(this.startRot, this.targetRot, this.interp, this.rot);
                this.pos[1] = Terrain.getHeight(this.pos[0], this.pos[2], true) + 20.0;
                this._dirty = true;
            }
        },

        applyState: function(state) {
            if(this.interp !== 5000.0) {
                vec3.set(this.targetPos, this.startPos);
                vec3.set(this.targetRot, this.startRot);
            }

            vec3.add(this.pos, [state.x, state.y, state.z], this.targetPos);
            vec3.add(this.rot,
                     [state.rotX, state.rotY, state.rotZ],
                     this.targetRot);

            this.interp = 0.0;
        }
    });

    if(typeof module !== 'undefined') {
        module.exports = Entity;
    }
    else {
        window.Entity = Entity;
    }

}).apply(this, (typeof module !== 'undefined' ?
                [require('./node-shade').SceneNode,
                 require('./terrain'),
                 require('./packets'),
                 require('./shade/gl-matrix').vec3] :
                [sh.SceneNode, Terrain, null, vec3]));