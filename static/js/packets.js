(function() {

    var USE_ARRAY_BUFFER = (typeof Buffer === 'undefined');
    var PACKET_TYPES = [];

    var basePacket = packetType([
        ['type', 'int32'],
        ['from', 'int32']
    ]);

    var inputPacket = packetType(basePacket, [
        ['dt', 'float'],
        ['sequenceId', 'int32'],
        ['mouseX', 'int32'],
        ['mouseY', 'int32'],
        ['mouseDown', 'int32'],
        ['left', 'int32'],
        ['right', 'int32'],
        ['up', 'int32'],
        ['down', 'int32']
    ]);

    var statePacket = packetType(basePacket, [
        ['sequenceId', 'int32'],
        ['x', 'float'],
        ['y', 'float'],
        ['z', 'float'],
        ['rotX', 'float'],
        ['rotY', 'float'],
        ['rotZ', 'float']
    ]);

    var clickPacket = jsPacketType(basePacket, [
        'entIds',
        'entInterps',
        'seqIds',
        'x', 'y', 'z',
        'x2', 'y2', 'z2'
    ]);

    var joinPacket = packetType(basePacket, [
        ['id', 'int32'],
        ['x', 'float'],
        ['y', 'float'],
        ['z', 'float'],
        ['rotX', 'float'],
        ['rotY', 'float'],
        ['rotZ', 'float']        
    ]);

    var joinRoomPacket = jsPacketType(basePacket, ['room']);
    var newUserPacket = jsPacketType(basePacket, ['id', 'name', 'playerCount']);
    var gameStartPacket = jsPacketType(basePacket, ['started']);
    var gameOverPacket = jsPacketType(basePacket, ['scores', 'nextGameId']);
    var leavePacket = jsPacketType(basePacket, ['id', 'name']);
    var messagePacket = jsPacketType(basePacket, ['name', 'message']);
    var cmdPacket = jsPacketType(basePacket, ['method', 'args']);
    var cmdResPacket = jsPacketType(basePacket, ['method', 'res']);

    function jsPacketType(inherit, fields) {
        if(!fields) {
            fields = inherit;
            inherit = null;
        }

        var inheritFields = inherit.fields.map(function(field) { return field[0]; });
        fields = inheritFields.concat(fields);

        function make(obj) {
            var res = [];

            fields.forEach(function(field) {
                if(obj[field] === undefined) {
                    throw new Error('missing field: ' + field);
                }

                res.push(obj[field]);
            });

            return res;
        };

        PACKET_TYPES.push(make);
        make.typeId = PACKET_TYPES.length - 1;
        make.fields = fields;

        return make;
    }

    // Quick little format definition so I can share this between
    // client/server
    function packetType(inherit, desc) {
        if(!desc) {
            desc = inherit;
            inherit = null;
        }

        var bytes = 0;

        if(inherit) {
            desc = inherit.fields.concat(desc);
            bytes += inherit.byteLen;
        }

        desc.forEach(function(field) {
            switch(field[1]) {
            case 'int32':
            case 'float':
                bytes += 4;
                break;
            }
        });

        var res = { fields: desc, byteLen: bytes };

        PACKET_TYPES.push(res);
        res.typeId = PACKET_TYPES.length - 1;

        return res;
    }

    function parsePacket(buffer, desc) {
        var $F;
        var $I;
        var obj = {};
        var pos = 0;

        if(USE_ARRAY_BUFFER) {
            $F = new Float32Array(buffer);
            $I = new Int32Array(buffer);
        }

        for(var i=0, l=desc.fields.length; i<l; i++) {
            var field = desc.fields[i];

            switch(field[1]) {
            case 'float':
                if(USE_ARRAY_BUFFER) {
                    obj[field[0]] = $F[pos / 4];
                }
                else {
                    obj[field[0]] = buffer.readFloatLE(pos);
                }
                
                pos += 4;
                break;
            case 'int32':
                if(USE_ARRAY_BUFFER) {
                    obj[field[0]] = $I[pos / 4];
                }
                else {
                    obj[field[0]] = buffer.readInt32LE(pos);
                }

                pos += 4;
                break;
            }
        }

        return obj;
    };

    function makePacket(obj, desc) {
        var buffer;
        var $F;
        var $I;
        var pos = 0;

        if(USE_ARRAY_BUFFER) {
            buffer = new ArrayBuffer(desc.byteLen);
            $F = new Float32Array(buffer);
            $I = new Int32Array(buffer);
        }
        else {
            buffer = new Buffer(desc.byteLen);
        }

        for(var i=0, l=desc.fields.length; i<l; i++) {
            var field = desc.fields[i];

            if(obj[field[0]] === undefined) {
                throw new Error('invalid packet, missing field: ' + field[0]);
            }

            switch(field[1]) {
            case 'float':
                if(USE_ARRAY_BUFFER) {
                    $F[pos / 4] = obj[field[0]];
                }
                else {
                    buffer.writeFloatLE(obj[field[0]], pos);
                }

                pos += 4;
                break;
            case 'int32':
                if(USE_ARRAY_BUFFER) {
                    $I[pos / 4] = obj[field[0]];
                }
                else {
                    buffer.writeInt32LE(obj[field[0]], pos);
                }

                pos += 4;
                break;
            }
        }

        return buffer;
    };

    function objectifyPacket(packet) {
        var desc = getPacketDesc(packet[0]);
        var obj = {};
        var i = 0;

        desc.fields.forEach(function(field) {
            obj[field] = packet[i];
            i++;
        });

        return obj;
    }

    function getPacketDesc(type) {
        return PACKET_TYPES[type];
    }

    var packets = {
        basePacket: basePacket,
        joinRoomPacket: joinRoomPacket,
        newUserPacket: newUserPacket,
        joinPacket: joinPacket,
        gameStartPacket: gameStartPacket,
        gameOverPacket: gameOverPacket,
        leavePacket: leavePacket,
        inputPacket: inputPacket,
        clickPacket: clickPacket,
        statePacket: statePacket,
        messagePacket: messagePacket,
        cmdPacket: cmdPacket,
        cmdResPacket: cmdResPacket,

        parsePacket: parsePacket,
        makePacket: makePacket,
        objectifyPacket: objectifyPacket,
        getPacketDesc: getPacketDesc
    };

    if(typeof module !== 'undefined') {
        module.exports = packets;
    }
    else {
        window.packets = packets;
    }
})();