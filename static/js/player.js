
(function(Camera, Terrain, packets, vec3) {

    var Player = Camera.extend({
        init: function(opts) {
            this.parent(opts.pos, opts.rot, opts.scale);
            this.speed = 100;

            this.goodPos = vec3.create();
            vec3.set(this.pos, this.goodPos);
            this.goodRot = vec3.create();
            vec3.set(this.rot, this.goodRot);            

            this.sequenceId = 0;
            this.serverUser = opts.serverUser;
            this.getHeight = opts.getHeight;

            this.pos[1] = Terrain.getHeight(this.pos[0], this.pos[2], true) + 20.0;

            this.stateBuffer = [];
            this.packetBuffer = [];
        },

        update: function(dt) {
            this.handleClientInput(dt);
        },

        handleClientInput: function(dt) {
            var moved = false;
            var mouse = input.getMouseMoved();
            var diffPos = vec3.create();
            vec3.set(this.pos, diffPos);
            var diffRot = vec3.create();
            vec3.set(this.rot, diffRot);

            // We do client-side prediction here by instantly updating the
            // player according to input, but also record the input and send
            // it to the server.

            this.resetState();
            var state = this.state;

            if(mouse[0] !== 0 && mouse[1] !== 0) {
                moved = true;
                this.rotateX(mouse[1] * -.01);
                this.rotateY(mouse[0] * -.01);
            }

            state.mouseX = mouse[0];
            state.mouseY = mouse[1];
            state.mouseDown = input.isMouseDown() ? 1 : 0;

            if((input.isDown('LEFT') || input.isDown('a'))) {
                moved = true;
                if(input.isMouseDown()) {
                    this.moveLeft(this.speed * dt);
                }
                else {
                    this.rotateY(.02);
                }

                state.left = 1;
            }

            if((input.isDown('RIGHT') || input.isDown('d'))) {
                moved = true;
                if(input.isMouseDown()) {
                    this.moveRight(this.speed * dt);
                }
                else {
                    this.rotateY(-.02);
                }

                state.right = 1;
            }

            if(input.isDown('UP') || input.isDown('w')) {
                moved = true;
                this.moveForward(this.speed * dt);
                state.up = 1;
            }

            if(input.isDown('DOWN') || input.isDown('s')) {
                moved = true;
                this.moveBack(this.speed * dt);
                state.down = 1;
            }

            this.pos[1] = Terrain.getHeight(this.pos[0], this.pos[2], true) + 20.0;

            if(moved) {
                vec3.subtract(this.pos, diffPos, diffPos);
                vec3.subtract(this.rot, diffRot, diffRot);
                this.saveState(diffPos, diffRot, this.sequenceId);

                state.dt = dt;
                state.sequenceId = this.sequenceId++;
                server.sendInput(state);
            }
        },

        handleServerInput: function(state) {
            // Run the player's movement on the server-side.

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

            this.packetBuffer.push(packets.makePacket(obj, packets.statePacket));
        },

        flushPackets: function() {
            for(var i=0, l=this.packetBuffer.length; i<l; i++) {
                this.serverUser.stream.write(this.packetBuffer[i]);
            }

            this.packetBuffer = [];
        },

        saveState: function(pos, rot, sequenceId) {
            this.stateBuffer.push({
                x: pos[0],
                y: pos[1],
                z: pos[2],
                rotX: rot[0],
                rotY: rot[1],
                rotZ: rot[2],
                sequenceId: sequenceId
            });
        },

        resetState: function() {
            this.state = {
                dt: 0.0,
                left: 0,
                right: 0,
                up: 0,
                down: 0,
                mouseX: 0,
                mouseY: 0
            };
        },

        applyState: function(state) {
            // The last known good state!!!!
            var goodPos = this.goodPos;
            var goodRot = this.goodRot;
            var buffer = this.stateBuffer;
            var pos = this.pos;
            var rot = this.rot;

            if(state.sequenceId != buffer[0].sequenceId) {
                throw new Error('mismatched sequence ids OH NOES ' +
                                'GOOD LUCK DEBUGGING THAT');
            }

            // Add the new good state to the current good state,
            // ignoring the predicted state
            // console.log('predicted [' + buffer[0].sequenceId + ']: ',
            //             buffer[0].x, buffer[0].y, buffer[0].z);
            // console.log('server [' + state.sequenceId + ']: ',
            //             state.x, state.y, state.z);

            vec3.add(goodPos, [state.x, state.y, state.z]);
            vec3.add(goodRot, [state.rotX, state.rotY, state.rotZ]);

            vec3.set(goodPos, pos);
            vec3.set(goodRot, rot);

            // Apply the rest to get the final state
            for(var i=1, l=buffer.length; i<l; i++) {
                var pState = buffer[i];
                vec3.add(pos, [pState.x, pState.y, pState.z]);
                vec3.add(rot, [pState.rotX, pState.rotY, pState.rotZ]);
            }

            buffer.shift();
        }
    });

    if(typeof module !== 'undefined') {
        module.exports = Player;
    }
    else {
        window.Player = Player;
    }

}).apply(this, typeof module !== 'undefined' ?
         [require('./node-shade').Camera,
          require('./terrain'),
          require('./packets'),
          require('./shade/gl-matrix').vec3] :
         [sh.Camera, Terrain, null, vec3]);
