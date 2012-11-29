
(function(SceneNode, Cube, CubeMesh, Terrain, Collision, packets, vec3, mat4) {

    var Entity = SceneNode.extend({
        init: function(opts) {
            opts = opts || {};
            this.parent(opts.pos, opts.rot, opts.scale);
            this.speed = opts.speed || 100;

            // The server does the collision for us (whee)
            this.collisionType = Collision.NONE;

            this.sequenceId = 0;
            this.pos[1] = Terrain.getHeight(this.pos[0], this.pos[2], true) + 20.0;

            // Initially turn them around to face the positive Z axis.
            if(!opts.rot) {
                this.rotateY(Math.PI);
            }

            // Center whatever mesh is used
            this.preMatrix = mat4.create();
            mat4.identity(this.preMatrix);
            mat4.translate(this.preMatrix, [-.5, -.5, -.5]);

            if(!opts.scale) {
                this.setScale(25, 25, 25);
            }

            var halfScale = vec3.create();
            vec3.scale(this.scale, .5, halfScale);
            this.setAABB([0, 0, 0], halfScale);

            this.goodPos = vec3.create(this.pos);
            this.goodRot = vec3.create(this.rot);

            this.startPos = null;
            this.startRot = null;
            this.targetPos = null;
            this.targetRot = null;
            this.serverFreq = .1;
            this.interp = 1.0;

            this.packetBuffer = [];
            this.history = [];
            this.historyPos = vec3.create();
            this.historyRot = vec3.create();

            if(Cube && !Cube.mesh) {
                Cube.mesh = new CubeMesh();
                Cube.mesh.create();
            }
        },

        handleServerInput: function(state) {
            // Run the entity's movement on the server-side.
            var dt = state.dt;

            this.rotateX(state.mouseY * -Math.PI / 6.0 * dt);
            this.rotateY(state.mouseX * -Math.PI / 6.0 * dt);

            if(state.left) {
                if(state.mouseDown) {
                    this.moveLeft(this.speed * dt);
                }
                else {
                    this.rotateY(Math.PI / 2 * dt);
                }
            }

            if(state.right) {
                if(state.mouseDown) {
                    this.moveRight(this.speed * dt);
                }
                else {
                    this.rotateY(-Math.PI / 2 * dt);
                }
            }

            if(state.up) {
                this.moveForward(this.speed * dt);
            }

            if(state.down) {
                this.moveBack(this.speed * dt);
            }

            this.pos[1] = Terrain.getHeight(this.pos[0], this.pos[2], true) + 20.0;
        },

        snapshot: function() {
            vec3.set(this.pos, this.historyPos);
            vec3.set(this.rot, this.historyRot);
        },

        revert: function(alsoRot) {
            vec3.set(this.historyPos, this.pos);
            vec3.set(this.historyRot, this.rot);
        },

        sendDiff: function(sequenceId) {
            vec3.subtract(this.pos, this.historyPos, this.historyPos);
            vec3.subtract(this.rot, this.historyRot, this.historyRot);
            this.sendInput(this.historyPos, this.historyRot, sequenceId);
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
            vec3.set(this.pos, this.goodPos);
            vec3.set(this.rot, this.goodRot);
            return tmp;
        },

        saveHistory: function(state) {
            if(this.history.length > 10) {
                this.history.shift();
            }

            this.history.push(state);
        },

        rewind: function(sequenceId, interp) {
            if(sequenceId === 0) {
                // If there is no history available, don't rollback
                return;
            }

            vec3.set(this.pos, this.historyPos);
            vec3.set(this.rot, this.historyRot);

            for(var i=this.history.length - 1; i>=0; i--) {
                var state = this.history[i];

                if(state.sequenceId >= sequenceId) {
                    // Roll back this state packet
                    vec3.subtract(this.pos, [state.x, state.y, state.z]);
                    vec3.subtract(this.rot, [state.rotX, state.rotY, state.rotZ]);
                }

                if(state.sequenceId == sequenceId && i > 0 && interp > 0.0) {
                    // If we've hit the latest received state, and we
                    // have one more in the history, apply the
                    // interpolation that the client performs
                    // (important for fast movement)

                    var targetPos = vec3.create();
                    var targetRot = vec3.create();
                    vec3.add(this.pos, [state.x, state.y, state.z], targetPos);
                    vec3.add(this.rot, [state.rotX, state.rotY, state.rotZ], targetRot);
                    vec3.lerp(this.pos, targetPos, interp);
                    vec3.lerp(this.rot, targetRot, interp);
                }
            }
        },

        unrewind: function() {
            vec3.set(this.historyPos, this.pos);
            vec3.set(this.historyRot, this.rot);
        },

        restart: function(spawnPoint) {
            var sceneX = 256 * 4;
            var sceneY = 256 * 4;

            switch(spawnPoint) {
            case 0:
                this.setPos(0, 0, 0);
                this.setRot(0, Math.PI, 0);
                break;
            case 1:
                this.setPos(sceneX, 0, 0);
                this.setRot(0, Math.PI, 0);
                break;
            case 2:
                this.setPos(0, 0, sceneY);
                this.setRot(0, 0, 0);
                break;
            case 3:
                this.setPos(sceneX, 0, sceneY);
                this.setRot(0, 0, 0);
                break;
            }

            this.interp = 1.0;
            this.packetBuffer = [];
            this.startPos = this.targetPos = null;
            this.startRot = this.targetRot = null;
        },

        update: function(dt) {
            if(this.interp < 1.0) {
                this.interp += dt / this.serverFreq;
                vec3.lerp(this.startPos, this.targetPos, this.interp, this.pos);
                vec3.lerp(this.startRot, this.targetRot, this.interp, this.rot);
                this._dirty = true;
                this.AABB._dirty = true;
            }
        },

        applyState: function(state) {
            this.sequenceId = state.sequenceId;

            if(this.startPos === null) {
                this.startPos = vec3.create();
                this.startRot = vec3.create();

                vec3.add(this.pos,
                         [state.x, state.y, state.z],
                         this.startPos);
                vec3.add(this.rot,
                         [state.rotX, state.rotY, state.rotZ],
                         this.startRot);
            }
            else if(this.targetPos === null) {
                this.targetPos = vec3.create();
                this.targetRot = vec3.create();

                vec3.add(this.startPos,
                         [state.x, state.y, state.z],
                         this.targetPos);
                vec3.add(this.startRot,
                         [state.rotX, state.rotY, state.rotZ],
                         this.targetRot);
                this.interp = 0.0;
            }
            else {
                vec3.set(this.targetPos, this.startPos);
                vec3.set(this.targetRot, this.startRot);

                vec3.add(this.startPos, [state.x, state.y, state.z], this.targetPos);
                vec3.add(this.startRot,
                         [state.rotX, state.rotY, state.rotZ],
                         this.targetRot);
                this.interp = 0.0;
            }
        },

        render: function() {
            Cube.mesh.render(this._program.program);
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
                 null,
                 null,
                 require('./terrain'),
                 require('./node-shade').Collision,
                 require('./packets'),
                 require('./shade/gl-matrix').vec3,
                 require('./shade/gl-matrix').mat4] :
                [sh.SceneNode, sh.Cube, sh.CubeMesh, Terrain, sh.Collision, null, vec3, mat4]));