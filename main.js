var fs = require('fs');
var express = require('express');
var nunjucks = require('nunjucks');
var remix = require('webremix');
var settings = require('./settings');
var BinaryServer = require('binaryjs').BinaryServer;
var p = require('./static/js/packets');
var Scene = require('./scene');
var Room = require('./room');
var Entity = require('./static/js/entity');
var level = require('./static/js/level');

var app = express();
var env = new nunjucks.Environment(new nunjucks.FileSystemLoader('views'));
env.express(app);
var server = require('http').createServer(app);

app.configure(function() {
    app.use(express.static(__dirname + '/static'));
});

app.get('/', function(req, res) {
    res.render('index.html', {
        roomCount: roomCount(),
        currentRooms: Object.getOwnPropertyNames(ROOMS)
            .filter(function(name) {
                // Filter out nulls
                return ROOMS[name];
            }).map(function(name) {
                var r = ROOMS[name];
                return [r.name, r.count()];
            }),
        playerCount: playerCount(),
        noroom: 'noroom' in req.query
    });
});

app.get('/find', function(req, res) {
    var rooms = [];

    for(var k in ROOMS) {
        if(ROOMS.hasOwnProperty(k) && ROOMS[k]) {
            rooms.push(ROOMS[k]);
        }
    }

    rooms.sort(function(room1, room2) {
        return room1.count() < room2.count();
    });

    var found = false;
    for(var i=0; i<rooms.length; i++) {
        if(rooms[i].count() < MAX_PER_ROOM) {
            res.redirect('/' + rooms[i].name);
            found = true;
        }
    }

    if(!found) {
        res.redirect('/?noroom');
    }
});

app.get('/:id', function(req, res) {
    var id = req.params.id;
    res.render('game.html', { room: id });
});

// Sockets

var ROOMS = {};
var MAX_PER_ROOM = 8;

function handlePacket(user, data) {
    var packet, desc;
    var room = user.room;

    if(data instanceof Buffer) {
        packet = p.parsePacket(data, p.basePacket);
    }
    else {
        packet = p.objectifyPacket(data);
    }

    switch(p.getPacketDesc(packet.type)) {
    case p.inputPacket:
        packet = p.parsePacket(data, p.inputPacket);
        room.scene.update(user.entity, packet);
        break;
    case p.clickPacket:
        var entStates = {};
        for(var i=0; i<packet.entIds.length; i++) {
            entStates[packet.entIds[i]] = { seq: packet.seqIds[i],
                                            interp: packet.entInterps[i] };
        }

        var ents = room.scene.getHit(user,
                                     entStates,
                                     [packet.x, packet.y, packet.z],
                                     [packet.x2, packet.y2, packet.z2]);
        if(ents.length) {
            for(var i=0; i<ents.length; i++) {
                ents[i].hit();

                if(ents[i].isDead()) {
                    handleDeath(user, room.lookupUser(ents[i]));
                }
                else {
                    handleHit(user, room.lookupUser(ents[i]));
                }
            }
        }
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

            room.broadcast(user, packet);
            user.stream.write(packet);
        });
        break;
    case p.cmdPacket:
        var method = packet.method;
        var args = packet.args && packet.args.split(' ');

        switch(method) {
        case 'nick':
            var newName = args && args[0];

            if(newName) {
                packet = p.messagePacket({
                    type: p.messagePacket.typeId,
                    from: 0,
                    name: 'server',
                    message: ('*' + user.name + ' has changed his/her name to ' +
                              newName + '*')
                });

                user.name = newName;
                room.broadcast(user, packet);
                user.stream.write(packet);
            }
            break;
        case 'users':
        case 'names':
            var names = room.names();
            user.stream.write(p.cmdResPacket({
                type: p.cmdResPacket.typeId,
                from: 0,
                method: packet.method,
                res: names
            }));
            break;
        case 'me':
            if(args && args.length) {
                packet = p.cmdResPacket({
                    type: p.cmdResPacket.typeId,
                    from: 0,
                    method: packet.method,
                    res: '* ' + user.name + ' ' + args.join(' ')
                });

                room.broadcast(user, packet);
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

function handleHit(shooter, target) {
    var obj = {
        type: p.cmdPacket.typeId,
        from: 0,
        method: 'hit',
        args: null
    };

    target.stream.write(p.cmdPacket(obj));

    obj.from = target.id;
    shooter.stream.write(p.cmdPacket(obj));
}

function handleDeath(killerUser, killedUser) {
    var spawnPoint = Math.floor(Math.random() * 4);
    killedUser.entity.restart(spawnPoint);
    killedUser.numDeaths++;

    var obj = {
        type: p.cmdPacket.typeId,
        from: 0,
        method: 'die',
        args: [killerUser.name, killedUser.name, spawnPoint]
    };

    killedUser.stream.write(p.cmdPacket(obj));

    obj.from = killedUser.id;
    killedUser.room.broadcast(killedUser, p.cmdPacket(obj));
    killerUser.numKills++;
}

function newUserid() {
    var id;

    while(1) {
        id = Math.floor(Math.random() * 100000);
        if(!getUser('anon' + id)) {
            return id;
        }
    }

    console.log('ran out of user ids!');
    return null;
}

function getUser(id) {
    for(var i=0, l=ROOMS.length; i<l; i++) {
        var player = ROOMS.getPlayer(id);
        if(player) {
            return player;
        }
    }

    return null;
}

function createUser(stream, room) {
    var user = {
        stream: stream,
        id: newUserid(),
        numDeaths: 0,
        numKills: 0
    };

    if(!user.id) {
        return;
    }

    user.name = 'anon' + user.id;
    user.entity = new Entity();
    user.entity.id = user.name;
    user.room = room;
    room.addPlayer(user);

    console.log(user.name + ' connected [' + room.count() + ']');

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
        name: user.name,
        playerCount: room.count()
    }));

    stream.write(p.messagePacket({
        type: p.messagePacket.typeId,
        from: 0,
        name: 'server-intro',
        message: 'Welcome ' + user.name + '!'
    }));

    stream.write(p.messagePacket({
        type: p.messagePacket.typeId,
        from: 0,
        name: 'server-intro',
        message: 'Currently ' + room.count() + ' players are connected.'
    }));

    stream.write(p.messagePacket({
        type: p.messagePacket.typeId,
        from: 0,
        name: 'server-intro',
        message: 'Available commands:\n    /nick <name> Change your nick\n    /names           View connected users\n    /me                 Perform an action'
    }));

    room.players.forEach(function(otherUser) {
        if(user != otherUser) {
            var ent = otherUser.entity;
            var obj = {
                type: p.joinPacket.typeId,
                from: 0,
                id: otherUser.id,
                x: ent.goodPos[0],
                y: ent.goodPos[1],
                z: ent.goodPos[2],
                rotX: ent.goodRot[0],
                rotY: ent.goodRot[1],
                rotZ: ent.goodRot[2]
            };

            var packet = p.makePacket(obj, p.joinPacket);
            stream.write(packet);
        }
    });

    // Broadcast to everyone about the new player
    room.broadcast(user, p.makePacket({
        type: p.joinPacket.typeId,
        from: 0,
        id: user.id,
        x: user.entity.pos[0],
        y: user.entity.pos[1],
        z: user.entity.pos[2],
        rotX: user.entity.rot[0],
        rotY: user.entity.rot[1],
        rotZ: user.entity.rot[2]
    }, p.joinPacket));

    room.broadcast(user, p.messagePacket({
        type: p.messagePacket.typeId,
        from: 0,
        name: 'server',
        message: user.name + ' has joined'
    }));

    if(room.count() > 1) {
        if(!room.startTime()) {
            room.start();
            room.broadcast(null, p.gameStartPacket({
                type: p.gameStartPacket.typeId,
                from: 0,
                started: room.startTime()
            }));

            room.onEnd(function() {
                room.broadcast(null, p.gameOverPacket({
                    type: p.gameOverPacket.typeId,
                    from: 0,
                    scores: room.getScores(),
                    nextGameId: 'game' + Math.floor(Math.random() * 10000)
                }));
            });
        }
        else {
            room.broadcast(null, p.gameStartPacket({
                type: p.gameStartPacket.typeId,
                from: 0,
                started: room.startTime()
            }));
        }
    }

    return user;
}

function removeUser(user) {
    if(!user) {
        return;
    }

    var room = user.room;
    room.removePlayer(user);

    if(room.count() <= 0) {
        destroyRoom(room);
    }

    console.log(user.name + ' disconnected [' + room.count() + ']');

    // Broadcast to everyone that he/she left
    if(user.id) {
        room.broadcast(user, p.leavePacket({
            type: p.leavePacket.typeId,
            from: 0,
            id: user.id,
            name: user.name
        }));

        room.broadcast(user, p.messagePacket({
            type: p.messagePacket.typeId,
            from: 0,
            name: 'server',
            message: user.name + ' has left'
        }));
    }
}

function createRoom(name) {
    var scene = new Scene(255 * 4, 255 * 4);
    var room = new Room(name, scene);
    level.createLevel(scene);
    room.startSyncing();

    console.log('room "' + name + '" created [' + roomCount() + ']');

    return room;
}

function destroyRoom(room) {
    room.stopSyncing();
    ROOMS[room.name] = null;

    console.log('room "' + room.name + '" destroyed! [' + roomCount() + ']');
}

function roomCount() {
    var names = Object.getOwnPropertyNames(ROOMS);
    return names.filter(function(v) { return ROOMS[v]; }).length;
}

function playerCount() {
    var count = 0;
    for(var k in ROOMS) {
        if(ROOMS[k]) {
            count += ROOMS[k].count();
        }
    }
    return count;
}

// Create the actual connection

var bserver = new BinaryServer({ server: server });

bserver.on('connection', function(client) {
    var user;

    client.on('error', function(err) {
        console.log(err);
    });

    client.on('stream', function(stream) {
        function joinRoom(data) {
            var packet = p.objectifyPacket(data);

            if(typeof packet.room === 'string' && packet.room !== '') {
                if(playerCount() > 1200) {
                    stream.write(p.cmdPacket({
                        type: p.cmdPacket.typeId,
                        from: 0,
                        method: 'fullRoom',
                        args: ['server']
                    }));
                }
                else {
                    var room = ROOMS[packet.room];

                    if(!room) {
                        room = ROOMS[packet.room] = createRoom(packet.room);
                    }

                    if(room.count() >= MAX_PER_ROOM) {
                        stream.write(p.cmdPacket({
                            type: p.cmdPacket.typeId,
                            from: 0,
                            method: 'fullRoom',
                            args: ['room']
                        }));
                    }
                    else {
                        stream.removeListener('data', joinRoom);
                        user = createUser(stream, ROOMS[packet.room]);
                    }
                }
            }
        }

        stream.on('data', joinRoom);
    });

    client.on('close', function() {
        removeUser(user);
    });
});

// Fire up the server

console.log('Started server on ' + settings.port + '...');
server.listen(settings.port);
