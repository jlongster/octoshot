var fs = require('fs');
var express = require('express');
var remix = require('webremix');
var settings = require('./settings');
var BinaryServer = require('binaryjs').BinaryServer;
var p = require('./static/js/packets');

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
            try {
                CLIENTS[i].stream.write(packet);
            }
            catch(e) {
                console.log('send error: ' + e);
            }
        }
    }
}

function handlePacket(user, data) {
    var packet, desc;

    if(data instanceof Buffer) {
        packet = p.parsePacket(data, p.basePacket);
    }
    else {
        packet = p.objectifyPacket(data);
    }

    switch(p.getPacketDesc(packet.type)) {
    case p.movePacket:
        packet = p.parsePacket(data, p.movePacket);

        var obj = { type: p.movePacket.typeId,
                    from: user.id,
                    x: packet.x,
                    y: packet.y};
        broadcast(user, p.makePacket(obj, p.movePacket));
        break;
    case p.messagePacket:
        var message = packet.message;

        remix.generate(message, function(err, res) {
            packet = p.messagePacket({
                type: p.messagePacket.typeId,
                from: user.id,
                name: user.name,
                message: res
            });

            broadcast(user, packet);
            user.stream.write(packet);
        });
        break;
    case p.cmdPacket:
        var method = packet.method;
        var args = packet.args && packet.args.split(' ');

        switch(method) {
        case 'nick':
            var newName = args[0];

            if(newName) {
                packet = p.messagePacket({
                    type: p.messagePacket.typeId,
                    from: 0,
                    name: 'server',
                    message: ('*' + user.name + ' has changed his/her name to ' +
                              newName + '*')
                });

                user.name = newName;
                broadcast(user, packet);
                user.stream.write(packet);
            }
            break;
        case 'users':
        case 'names':
            var names = CLIENTS.map(function(user) { return user.name; });
            user.stream.write(p.cmdResPacket({
                type: p.cmdResPacket.typeId,
                from: 0,
                method: packet.method,
                res: names
            }));
            break;
        case 'me':
            if(args.length) {
                packet = p.cmdResPacket({
                    type: p.cmdResPacket.typeId,
                    from: 0,
                    method: packet.method,
                    res: '* ' + user.name + ' ' + args.join(' ')
                });

                broadcast(user, packet);
                user.stream.write(packet);
            }
            break;
        default:
            packet = p.messagePacket({
                type: p.messagePacket.typeId,
                from: 0,
                name: 'server',
                message: 'unknown command: ' + method
            });

            user.stream.write(packet);
        }
        break;
    default:
        console.log('unknown packet type: ' + packet.type);
    }
}

function newUserid() {
    var id;

    while(1) {
        id = Math.floor(Math.random() * 10000);
        if(!getUser(id)) {
            return id;
        }
    }

    console.log('ran out of user ids!');
    return null;
}

function getUser(id) {
    for(var i=0, l=CLIENTS.length; i<l; i++) {
        if(CLIENTS[i].id == id) {
            return CLIENTS[i];
        }
    }

    return null;
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
        var userId = newUserid();

        if(!userId) {
            return;
        }

        CLIENTS.push(user);
        user.stream = stream;
        user.id = userId;
        user.name = 'anon' + user.id;


        console.log(user.name + ' connected [' + CLIENTS.length + ']');

        stream.on('data', function(data) {
            handlePacket(user, data);
        });

        stream.on('error', function(err) {
            console.log(err);
        });

        // Tell the user his/her id
        stream.write(p.newUserPacket({

            type: p.newUserPacket.typeId,
            from: 0,
            id: user.id,
            name: user.name
        }));

        stream.write(p.messagePacket({
            type: p.messagePacket.typeId,
            from: 0,
            name: 'server',
            message: 'Welcome ' + user.name + '!'
        }));

        stream.write(p.messagePacket({
            type: p.messagePacket.typeId,
            from: 0,
            name: 'server',
            message: 'Currently ' + CLIENTS.length + ' players are connected.'
        }));

        stream.write(p.messagePacket({
            type: p.messagePacket.typeId,
            from: 0,
            name: 'server',
            message: 'Available commands:\n    /nick <name> Change your nick\n    /names           View connected users\n    /me                 Perform an action'
        }));

        CLIENTS.forEach(function(otherUser) {
            if(user != otherUser) {
                stream.write(p.joinPacket({
                    type: p.joinPacket.typeId,
                    from: 0,
                    id: otherUser.id,
                    name: otherUser.name
                }));
            }
        });

        // Broadcast to everyone about the new player
        broadcast(user, p.joinPacket({
            type: p.joinPacket.typeId,
            from: 0,
            id: user.id,
            name: user.name
        }));

        broadcast(user, p.messagePacket({
            type: p.messagePacket.typeId,
            from: 0,
            name: 'server',
            message: user.name + ' has joined'
        }));
    });

    client.on('close', function() {
        // Remove itself from the clients array
        CLIENTS.splice(CLIENTS.indexOf(user), 1);
        console.log(user.name + ' disconnected [' + CLIENTS.length + ']');

        // Broadcast to everyone that he/she left
        if(user.id) {
            broadcast(user, p.leavePacket({
                type: p.leavePacket.typeId,
                from: 0,
                id: user.id,
                name: user.name
            }));

            broadcast(user, p.messagePacket({
                type: p.messagePacket.typeId,
                from: 0,
                name: 'server',
                message: user.name + ' has left'
            }));
        }
    });
});

// Fire up the server

console.log('Started server on ' + settings.port + '...');
server.listen(settings.port);
