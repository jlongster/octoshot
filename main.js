var express = require('express');
var settings = require('./settings');
var BinaryServer = require('binaryjs').BinaryServer;
var p = require('./static/js/packets');
var fs = require('fs');

var app = express();
var server = require('http').createServer(app);

app.configure(function() {
    app.use(express.static(__dirname + '/static'));
});

// Sockets

var CLIENTS = [];

function broadcast(packet) {
    for(var i=0, l=CLIENTS.length; i<l; i++) {
        CLIENTS[i].send(packet);
    }
}

var bserver = new BinaryServer({ server: server });

bserver.on('connection', function(client) {
    CLIENTS.push(client);
    console.log('client connected [' + CLIENTS.length + ']');

    client.on('error', function(err) {
        console.log(err);
    });

    client.on('stream', function(stream) {
        stream.on('data', function(data) {
            var packet = p.parsePacket(data, p.basePacket);
            switch(p.getPacketDesc(packet.type)) {
            case p.movePacket:
                packet = p.parsePacket(data, p.movePacket);
                console.log(packet.x, packet.y);
                break;
            default:
                console.log('unknown packet type: ' + packet.type);
            }
        });

        stream.on('error', function(err) {
            console.log(err);
        });
    });

    client.on('close', function() {
        // Remove itself from the clients array
        CLIENTS.splice(CLIENTS.indexOf(client));
        console.log('client disconnected [' + CLIENTS.length + ']');
    });
});

// Fire up the server

console.log('Started server on ' + settings.port + '...');
server.listen(settings.port);
