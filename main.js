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

function broadcast(user, packet) {
    for(var i=0, l=CLIENTS.length; i<l; i++) {
        if(CLIENTS[i] != user) {
            CLIENTS[i].stream.write(packet);
        }
    }
}

function handlePacket(user, data) {
    var packet = p.parsePacket(data, p.basePacket);

    switch(p.getPacketDesc(packet.type)) {
    case p.movePacket:
        packet = p.parsePacket(data, p.movePacket);

        var obj = { type: p.movePacket.typeId,
                    from: user.id,
                    x: packet.x,
                    y: packet.y};
        broadcast(user, p.makePacket(obj, p.movePacket));
        break;
    default:
        console.log('unknown packet type: ' + packet.type);
    }
}

var bserver = new BinaryServer({ server: server });

bserver.on('connection', function(client) {
    var user = {
        client: client,
        stream: null,
        id: null
    };

    client.on('error', function(err) {
        console.log(err);
    });

    client.on('stream', function(stream) {
        CLIENTS.push(user);
        user.stream = stream;
        user.id = CLIENTS.length;

        console.log('client connected [' + user.id + ']');

        stream.on('data', function(data) {
            handlePacket(user, data);
        });

        stream.on('error', function(err) {
            console.log(err);
        });

        // Tell the user his/her id
        var obj = { type: p.newUserPacket.typeId,
                    from: 0,
                    id: user.id };
        stream.write(p.makePacket(obj, p.newUserPacket));

        CLIENTS.forEach(function(otherUser) {
            if(user != otherUser) {
                var join = { type: p.joinPacket.typeId,
                             from: 0,
                             id: otherUser.id };
                stream.write(p.makePacket(join, p.joinPacket));
            }
        });

        // Broadcast to everyone about the new player
        var join = { type: p.joinPacket.typeId,
                     from: 0,
                     id: obj.id };
        broadcast(user, p.makePacket(join, p.joinPacket));        
    });

    client.on('close', function() {
        // Remove itself from the clients array
        CLIENTS.splice(CLIENTS.indexOf(user), 1);
        console.log('client disconnected [' + user.id + ']');

        // Broadcast to everyone that he/she left
        if(user.id) {
            var obj = { type: p.leavePacket.typeId,
                        from: 0,
                        id: user.id };
            broadcast(user, p.makePacket(obj, p.leavePacket));
        }
    });
});

// Fire up the server

console.log('Started server on ' + settings.port + '...');
server.listen(settings.port);
