var express = require('express');
var settings = require('./settings');
var BinaryServer = require('binaryjs').BinaryServer;
var binstruct = require('binstruct');
var fs = require('fs');

var app = express();
var server = require('http').createServer(app);

app.configure(function() {
    app.use(express.static(__dirname + '/static'));
});

// Sockets

var clients = [];

// Quick little format definition so I can share this between
// client/server
var basePacket = [
    ['type', 'int32'],
    ['from', 'int32']
];

var movePacket = basePacket.concat([
    ['x', 'float'],
    ['y', 'float']
]);

var PACKET_TYPES = [];

function createPacketDef(desc) {
    var def = binstruct.def();

    for(var i=0, l=desc.length; i<l; i++) {
        var field = desc[i];

        switch(field[1]) {
        case 'float':
            def = def.floatle(field[0]);
            break;
        case 'int32':
            def = def.int32le(field[0]);
        }
    }

    PACKET_TYPES.push(def);
    def.typeId = PACKET_TYPES.length - 1;

    return def;
}

basePacket = createPacketDef(basePacket);
movePacket = createPacketDef(movePacket);

function broadcast(msg) {
    for(var i=0, l=clients.length; i<l; i++) {
        clients[i].send(msg);
    }
}

var bserver = new BinaryServer({ server: server });

bserver.on('connection', function(client) {
    clients.push(client);
    console.log('client connected [' + clients.length + ']');

    client.on('stream', function(stream) {
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

            var packet = basePacket.wrap(parts[0]);
            switch(PACKET_TYPES[packet.type]) {
            case movePacket:
                packet = movePacket.wrap(parts[0]);
                console.log(packet.x, packet.y);
                break;
            default:
                console.log('unknown packet type: ' + packet.type);
            }
        });
    });

    client.on('close', function() {
        // Remove itself from the clients array
        clients.splice(clients.indexOf(client));
        console.log('client disconnected [' + clients.length + ']');
    });
});

// Fire up the server

console.log('Started server on ' + settings.port + '...');
server.listen(settings.port);
