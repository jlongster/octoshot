
(function(Entity, Terrain, Collision, vec3) {

    var Player = Entity.extend({
        init: function(opts) {
            this.parent(opts);
            this.collisionType = Collision.ACTIVE;
            this.upVelocity = 0.0;

            var halfScale = vec3.create();
            vec3.scale(this.scale, .5, halfScale);
            this.setScale(1, 1, 1);
            this.setAABB(vec3.createFrom(0, 0, 0), halfScale);

            this.jumpCount = 0;
            this.stateBuffer = [];
        },

        update: function(dt) {
            this.handleClientInput(dt);
        },

        render: function() {
        },

        handleClientInput: function(dt) {
            var moved = false;
            var mouse = input.getMouseMoved();

            if(!renderer.fullscreen && !input.isMouseDown()) {
                mouse = [0, 0];
            }

            var diffPos = vec3.create();
            vec3.set(this.pos, diffPos);
            var diffRot = vec3.create();
            vec3.set(this.rot, diffRot);

            // We do client-side prediction here by instantly updating the
            // player according to input, but also record the input and send
            // it to the server.

            this.resetInputState();
            var state = this.state;

            if(mouse[0] !== 0 || mouse[1] !== 0) {
                moved = true;
                this.rotateX(mouse[1] * -.005);
                this.rotateY(mouse[0] * -.005);
            }

            if(this.rot[0] < -Math.PI / 2.0) {
                this.rot[0] = -Math.PI / 2.0;
            }
            else if(this.rot[0] > Math.PI / 2.0) {
                this.rot[0] = Math.PI / 2.0;
            }

            state.mouseX = mouse[0];
            state.mouseY = mouse[1];
            state.mouseDown = input.isMouseDown() ? 1 : 0;

            if((input.isDown('LEFT') || input.isDown('a'))) {
                moved = true;
                this.moveLeft(this.speed * dt);
                state.left = 1;
            }

            if((input.isDown('RIGHT') || input.isDown('d'))) {
                moved = true;
                this.moveRight(this.speed * dt);
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

            if(input.isPressed('SPACE') && this.jumpCount < 2) {
                moved = true;
                this.jumpCount++;
                this.upVelocity = 5.0;
            }

            if(this.jumpCount) {
                moved = true;
                this.applyVelocity(dt);
            }

            if(moved) {
                vec3.subtract(this.pos, diffPos, diffPos);
                vec3.subtract(this.rot, diffRot, diffRot);
                this.saveState(diffPos, diffRot, this.sequenceId);

                state.dt = dt;
                state.sequenceId = this.sequenceId++;
                server.sendInput(state);
            }

            if((renderer.fullscreen && input.isMouseClicked()) ||
               (!renderer.fullscreen && input.isPressed('e'))) {
                var coord = [renderer.width / 2.0,
                             renderer.height / 2.0];

                resources.get('sounds/laser.wav').play();

                // Evidently, we need to flip the y value
                var screenPos = vec3.createFrom(coord[0],
                                                renderer.height - coord[1],
                                                0);
                var v1 = vec3.create();
                var v2 = vec3.create();

                vec3.unproject(screenPos,
                               scene.camera.inverseTransform,
                               renderer.persMatrix,
                               vec4.createFrom(0, 0,
                                               renderer.width, renderer.height),
                               v1);

                screenPos[2] = 1.0;

                vec3.unproject(screenPos,
                               scene.camera.inverseTransform,
                               renderer.persMatrix,
                               vec4.createFrom(0, 0,
                                               renderer.width, renderer.height),
                               v2);

                // DEBUG
                // var line = new sh.Line({ v1: v1,
                //                          v2: v2 });
                // scene.addObject(line);

                var entIds = [];
                var entInterps = [];
                var seqIds = [];

                scene.traverse(function(obj) {
                    if(obj instanceof Entity && obj.id) {
                        entIds.push(obj.id);
                        entInterps.push(obj.interp);
                        seqIds.push(obj.sequenceId);
                    }
                });

                server.sendClick(entIds, entInterps, seqIds, v1, v2);
            }
        },

        applyVelocity: function(dt) {
            this.translateY(this.upVelocity);
            this.upVelocity -= 8.0 * dt;

            var h = this.getLowestHeight();
            if(this.pos[1] < h) {
                this.jumpCount--;
                this.pos[1] = h;
            }
        },

        setHeight: function() {
            if(!this.jumpCount) {
                this.parent();
            }
        },

        hit: function() {
            this.health--;
            
            var heart = scene.getObject('heart' + this.health);
            if(heart) {
                heart.setImage('img/heart-grey.png');
            }
        },

        resetState: function() {
            this.parent();

            for(var i=0; i<3; i++) {
                var heart = scene.getObject('heart' + i);
                if(heart) {
                    heart.setImage('img/heart.png');
                }
            }
        },

        restart: function(spawnPoint) {
            this.parent(spawnPoint);
            vec3.set(this.pos, this.goodPos);
            vec3.set(this.rot, this.goodRot);
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

        resetInputState: function() {
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

            if(!this.isGod) {
                // vec3.set(goodPos, pos);
                // vec3.set(goodRot, rot);

                // // Apply the rest to get the final state
                // for(var i=bufferIdx + 1, l=buffer.length; i<l; i++) {
                //     var pState = buffer[i];
                //     vec3.add(pos, [pState.x, pState.y, pState.z]);
                //     vec3.add(rot, [pState.rotX, pState.rotY, pState.rotZ]);
                // }
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
          require('./node-shade').Collision,
          require('./shade/gl-matrix').vec3] :
         [Entity, Terrain, sh.Collision, vec3]);
