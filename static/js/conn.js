
var PACKET_TYPES = [];

function packet(inherit, desc) {
    if(!desc) {
        desc = inherit;
        inherit = null;
    }

    var bytes = 0;

    if(inherit) {
        desc = inherit.fields.concat(desc);
        bytes += inherit.bytes;
    }

    desc.forEach(function(field) {
        switch(field[1]) {
        case 'int32':
        case 'float':
            bytes += 4;
            break;
        }
    });

    var res = { fields: desc, bytes: bytes };

    PACKET_TYPES.push(res);
    res.typeId = PACKET_TYPES.length - 1;

    return res;
}

var basePacket = packet([
    ['type', 'int32'],
    ['from', 'int32']
]);

var movePacket = packet(basePacket, [
    ['x', 'float'],
    ['y', 'float']
]);

var Server = sh.Obj.extend({
    init: function() {
        this.client = new BinaryClient('ws://' + location.host);

        var _this = this;
        this.client.on('stream', function(stream) {
            var parts = [];

            stream.on('data', function(data) {
                parts.push(data);
            });

            stream.on('error', function(err) {
                console.log(err);
            });

            stream.on('end', function() {
                if(parts.length > 1) {
                    throw new Error("multiple chunks incoming, we don't " +
                                    "support that yet");
                }

                var buffer = parts[0];
                _this.handlePacket(buffer);
            });
        });
    },

    readPacket: function(buffer, desc) {
        var $F = new Float32Array(buffer);
        var $I = new Int32Array(buffer);
        var obj = {};
        var pos = 0;

        for(var i=0, l=desc.fields.length; i<l; i++) {
            var field = desc.fields[i];

            switch(field[1]) {
            case 'float':
                obj[field[0]] = $F[pos];
                pos += 4;
                break;
            case 'int32':
                obj[field[0]] = $I[pos];
                pos += 4;
                break;
            }
        }

        return obj;
    },

    writePacket: function(obj, desc) {
        var buffer = new ArrayBuffer(desc.bytes);
        var $F = new Float32Array(buffer);
        var $I = new Int32Array(buffer);
        var pos = 0;

        for(var i=0, l=desc.fields.length; i<l; i++) {
            var field = desc.fields[i];

            if(obj[field[0]] === undefined) {
                throw new Error('invalid packet, missing field: ' + field[0]);
            }

            switch(field[1]) {
            case 'float':
                $F[pos / 4] = obj[field[0]];
                pos += 4;
                break;
            case 'int32':
                $I[pos / 4] = obj[field[0]];
                pos += 4;
                break;
            }
        }

        return buffer;
    },

    handlePacket: function(buffer) {
        var obj = this.readPacket(buffer, basePacket);
        
        switch(PACKET_TYPES[obj.type]) {
        case movePacket:
            obj = this.readPacket(buffer, movePacket);
            console.log(obj.x, obj.y);
            break;
        }
    },

    sendMove: function(x, y) {
        var obj = { type: movePacket.typeId, from: 0,
                    x: x, y: y };
        this.client.send(this.writePacket(obj , movePacket));
    }
});