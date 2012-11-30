
(function(SceneNode, Cube, CubeMesh, Terrain, Collision, packets, vec3, mat4) {

    var Entity = Cube.extend({
        init: function(opts) {
            opts = opts || {};
            this.parent(opts.pos, opts.rot, opts.scale, { centered: true });
            this.speed = opts.speed || 100;

            // The server does the collision for us (whee)
            this.collisionType = Collision.NONE;

            // A hack to optimize entity collection in the scene graph
            this.isEntity = true;

            this.sequenceId = 0;
            this.goodPos = vec3.create();
            this.goodRot = vec3.create();
            this.restart(0);

            // Since by default you are respawned, make sure to re-set
            // the pos and rot
            if(opts.pos) {
                var p = opts.pos;
                this.setPos(p[0], p[1], p[2]);
            }

            if(opts.rot) {
                var r = opts.rot;
                this.setRot(r[0], r[1], r[2]);
            }
            
            if(!opts.scale) {
                this.setScale(10, 10, 10);
            }

            this.color = opts.color || vec3.createFrom(0, 0, 1);

            // Add some tentacles
            var R = this.addObject(new SceneNode({
                update: function(dt) {
                    this.rotateY(-Math.PI * dt);
                }
            }));
            R.AABB = null;
            
            for(var i=0; i<=Math.PI * 2; i+=Math.PI / 4) {
                var tent = R.addObject(new Cube(
                    [Math.sin(i) / 2.0, -1.1, Math.cos(i) / 2.0],
                    [-Math.cos(i) / 6.0, 0, Math.sin(i) / 6.0],
                    [.15, 1, .15],
                    { centered: true }
                ));

                var c = vec3.create();
                vec3.scale(this.color, .5, c);
                tent.color = c;
                tent.AABB = null;
            }

            if(typeof module === 'undefined') {
                this.setImage('img/octo.png');
                this.setMaterial(['textured.vsh', 'textured.fsh']);
                this.textureScale = vec2.createFrom(25.0 / 32.0,
                                                    150.0 / 256.0);
                this.blend = true;
                this.backface = true;
            }

            var halfScale = vec3.create();
            vec3.scale(this.scale, .5, halfScale);
            this.setAABB([0, 0, 0], halfScale);

            this.serverFreq = .1;
            this.history = [];
            this.historyPos = vec3.create();
            this.historyRot = vec3.create();

            if(CubeMesh && !Cube.mesh) {
                Cube.mesh = new CubeMesh();
                Cube.mesh.create();
            }
        },
        
        setPos: function(x, y, z) {
            this.parent(x, y, z);
            this.pos[1] = Terrain.getHeight(this.pos[0], this.pos[2], true) + 20.0;
        },
        
        translate: function(x ,y, z) {
            this.parent(x, y, z);
            this.pos[1] = Terrain.getHeight(this.pos[0], this.pos[2], true) + 20.0;
        },

        handleServerInput: function(state) {
            // Run the entity's movement on the server-side.
            var dt = state.dt;

            this.rotateX(state.mouseY * -Math.PI / 12.0 * dt);
            this.rotateY(state.mouseX * -Math.PI / 12.0 * dt);

            if(state.left) {
                this.moveLeft(this.speed * dt);
            }

            if(state.right) {
                this.moveRight(this.speed * dt);
            }

            if(state.up) {
                this.moveForward(this.speed * dt);
            }

            if(state.down) {
                this.moveBack(this.speed * dt);
            }
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
            // var sceneX = scene.sceneWidth;
            // var sceneY = scene.sceneDepth;
            var sceneX = 255 * 4;
            var sceneY = 255 * 4;
            
            switch(spawnPoint) {
            case 0:
                this.setPos(50, 0, 50);
                this.setRot(0, Math.PI, 0);
                break;
            case 1:
                this.setPos(sceneX - 50, 0, 50);
                this.setRot(0, Math.PI, 0);
                break;
            case 2:
                this.setPos(50, 0, sceneY - 50);
                this.setRot(0, 0, 0);
                break;
            case 3:
                this.setPos(sceneX - 50, 0, sceneY - 50);
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
                 require('./node-shade').Cube,
                 null,
                 require('./terrain'),
                 require('./node-shade').Collision,
                 require('./packets'),
                 require('./shade/gl-matrix').vec3,
                 require('./shade/gl-matrix').mat4] :
                [sh.SceneNode, sh.Cube, sh.CubeMesh, Terrain, sh.Collision, null, vec3, mat4]));