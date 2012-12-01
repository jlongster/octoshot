
var shade = require('./static/js/node-shade');
var p = require('./static/js/packets');
var collision = require('./static/js/node-shade').Collision;
var Scene = require('./static/js/node-shade').Scene;
var Entity = require('./static/js/entity');

module.exports = Scene.extend({
    init: function(sceneWidth, sceneDepth) {
        this.parent(sceneWidth, sceneDepth);
        this.packetBuffer = [];
    },

    getHit: function(user, entStates, start, end) {
        var res = [];

        this.traverse(function(ent) {
            if(!(ent instanceof Entity)) {
                return;
            }

            if(ent !== user.entity && entStates[ent.id]) {
                ent.rewind(entStates[ent.id].seq,
                           entStates[ent.id].interp);

                if(collision.boxLineHit(ent, start, end)) {
                    res.push(ent);
                }

                ent.unrewind();
            }
        });

        return res;
    },

    update: function(entity, packet) {
        entity.snapshot();
        entity.handleServerInput(packet);
        this.checkObjCollisions(entity);
        entity.sendDiff(packet.sequenceId);
    },

    start: function(room) {
        var _this = this;
        this._interval = setInterval(function() {
            _this.traverse(function(ent) {
                if(!(ent instanceof Entity)) {
                    return;
                }

                var user = room.lookupUser(ent);
                var buffer = ent.flushPackets();

                if(user) {
                    if(buffer.length) {
                        var state = {
                            type: p.statePacket.typeId,
                            from: 0,
                            sequenceId: buffer[buffer.length - 1].sequenceId,
                            x: 0,
                            y: 0,
                            z: 0,
                            rotX: 0,
                            rotY: 0,
                            rotZ: 0
                        };

                        for(var j=0, bl=buffer.length; j<bl; j++) {
                            var obj = buffer[j];
                            state.x += obj.x;
                            state.y += obj.y;
                            state.z += obj.z;
                            state.rotX += obj.rotX;
                            state.rotY += obj.rotY;
                            state.rotZ += obj.rotZ;
                        }

                        user.stream.write(p.makePacket(state, p.statePacket));
                        state.from = user.id;
                        room.broadcast(user, p.makePacket(state, p.statePacket));
                        ent.saveHistory(state);
                    }
                }
            });
        }, 100);
    },

    stop: function() {
        if(this._interval) {
            clearInterval(this._interval);
        }
    }
});
