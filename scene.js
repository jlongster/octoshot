
var shade = require('./static/js/node-shade');
var p = require('./static/js/packets');
var collision = require('./static/js/node-shade').Collision;
var Scene = require('./static/js/node-shade').Scene;

module.exports = Scene.extend({
    init: function(sceneWidth, sceneDepth) {
        this.parent(sceneWidth, sceneDepth);
        this.entities = [];
        this.packetBuffer = [];
    },

    getHit: function(user, entStates, start, end) {
        var ents = this.entities;
        for(var i=0, l=ents.length; i<l; i++) {
            var ent = ents[i];

            if(ent !== user.entity) {
                ent.rewind(entStates[ent.id].seq,
                           entStates[ent.id].interp);

                if(collision.boxLineHit(ent, start, end)) {
                    return ents[i];
                }

                ent.unrewind();
            }

        }
    },

    update: function(entity, packet) {
        entity.snapshot();
        entity.handleServerInput(packet);
        this.checkObjCollisions(entity);
        entity.sendDiff(packet.sequenceId);
    },

    start: function(lookupUser, broadcast) {
        var _this = this;
        setInterval(function() {
            var ents = _this.entities;

            for(var i=0, l=ents.length; i<l; i++) {
                var entity = ents[i];
                var user = lookupUser(entity);
                var buffer = entity.flushPackets();

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
                    broadcast(user, p.makePacket(state, p.statePacket));
                    entity.saveHistory(state);
                }
            }
        }, 100);
    }
});
