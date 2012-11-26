
(function(Entity, Terrain, vec3) {

    var Player = Entity.extend({
        init: function(opts) {
            this.parent(opts);

            this.goodPos = vec3.create();
            vec3.set(this.pos, this.goodPos);
            this.goodRot = vec3.create();
            vec3.set(this.rot, this.goodRot);
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

            if(state.sequenceId < buffer[0].sequenceId) {
                throw new Error('mismatched sequence ids OH NOES ' +
                                'GOOD LUCK DEBUGGING THAT');
            }

            // Skip any old state that the server skipped
            var bufferIdx = 0;
            while(buffer[bufferIdx].sequenceId < state.sequenceId) {
                bufferIdx++;
                if(bufferIdx === buffer.length) {
                    throw new Error('sequence id does not exist locally');
                }
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
            for(var i=bufferIdx + 1, l=buffer.length; i<l; i++) {
                var pState = buffer[i];
                vec3.add(pos, [pState.x, pState.y, pState.z]);
                vec3.add(rot, [pState.rotX, pState.rotY, pState.rotZ]);
            }

            buffer = buffer.slice(bufferIdx + 1);
        }
    });

    if(typeof module !== 'undefined') {
        module.exports = Player;
    }
    else {
        window.Player = Player;
    }

}).apply(this, typeof module !== 'undefined' ?
         [require('./entity'),
          require('./terrain'),
          require('./shade/gl-matrix').vec3] :
         [Entity, Terrain, vec3]);
