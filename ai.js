var BinaryClient = require('binaryjs').BinaryClient;
var p = require('./static/js/packets');
var Entity = require('./static/js/entity');
var vec3 = require('./static/js/shade/gl-matrix').vec3;

var client = new BinaryClient('ws://localhost:4000');
var stream;

var room = process.argv[2];
console.log('connecting to ' + room + '...');

var bot = new Entity();
var entities = {};
var userId, username;

client.on('open', function() {
    stream = client.createStream();

    stream.write(p.joinRoomPacket({
        type: p.joinRoomPacket.typeId,
        from: 0,
        room: room
    }));

    stream.on('data', function(data) {
        handlePacket(data);
    });

    stream.on('error', function(err) {
        console.log(err);
    });

    initAI();
    runAI();
});

function handlePacket(data) {
    var packet;
    if(data instanceof Buffer) {
        packet = p.parsePacket(data, p.basePacket);
    }
    else {
        packet = p.objectifyPacket(data);
    }

    switch(p.getPacketDesc(packet.type)) {
    case p.joinPacket:
        var obj = p.parsePacket(data, p.joinPacket);
        var ent = new Entity({
            pos: [obj.x, obj.y, obj.z],
            rot: [obj.rotX, obj.rotY, obj.rotZ],
            color: [Math.random(), Math.random(), Math.random()]
        });
        ent.id = 'anon' + obj.id;
        entities[obj.id] = ent;
        break;
    case p.leavePacket:
        var obj = packet;
        delete entities[obj.id];
        break;
    case p.newUserPacket:
        var obj = packet;
        userId = obj.id;
        username = obj.name;

        stream.write(p.messagePacket({
            type: p.messagePacket.typeId,
            from: 0,
            name: username,
            message: 'I am a bot here to destroy you. Please invite other friends as this is more fun with up to 8 players. Press F1 to chat.'
        }));

        break;
    case p.statePacket:
        var obj = p.parsePacket(data, p.statePacket);
        if(obj.from !== 0) {
            entities[obj.from].applyState(obj);
            entities[obj.from].update(.1);
        }
        else {
            bot.applyState(obj);
            bot.update(.1);
        }

        break;
    case p.gameOverPacket:
        process.exit(0);
        break;
    case p.cmdPacket:
        var obj = packet;
        if(obj.method == 'die') {
            if(obj.from !== 0) {
                entities[obj.from].restart(obj.args[2]);
            }
            else {
                bot.restart(obj.args[2]);
            }
        }
    }
}

// AI

function initAI() {
    var obj = {
        type: p.inputPacket.typeId,
        from: 0,
        dt: 2.0,
        sequenceId: id++,
        mouseX: 0,
        mouseY: 0,
        mouseDown: 0,
        left: 0,
        right: 0,
        up: 1,
        down: 0
    };

    var packet = p.makePacket(obj, p.inputPacket);
    stream.write(packet);

    obj = {
        type: p.inputPacket.typeId,
        from: 0,
        dt: 0.1,
        sequenceId: id++,
        mouseX: 0,
        mouseY: 0,
        mouseDown: 0,
        left: 1,
        right: 0,
        up: 0,
        down: 0
    };

    packet = p.makePacket(obj, p.inputPacket);
    stream.write(packet);
}

var last = Date.now();
var id = 0;
function runAI() {
    var now = Date.now();
    var dt = (now - last) / 1000;

    var obj = {
        type: p.inputPacket.typeId,
        from: 0,
        dt: dt,
        sequenceId: id++,
        mouseX: 0,
        mouseY: 0,
        mouseDown: 0,
        left: 0,
        right: 0,
        up: 0,
        down: 0
    };

    var key = null;
    for(var k in entities) {
        key = k;
        break;
    }

    if(entities[key]) {
        var a = entities[key].pos;
        var b = bot.pos;
        var dir = vec3.create();
        vec3.subtract(a, b, dir);

        var dist = vec3.length(dir);

        if(dist > 50) {
            if(bot.rot[1] > .03) {
                obj.mouseX = 1;
            }
            else if(bot.rot[1] < -.03) {
                obj.mouseX = -1;
            }
            else {
                if(Math.abs(dir[0]) > Math.abs(dir[2])) {
                    if(dir[0] < 0) {
                        obj.left = 1;
                    }
                    else {
                        obj.right = 1;
                    }
                }
                else {
                    if(dir[2] < 0) {
                        obj.up = 1;
                    }
                    else {
                        obj.down = 1;
                    }
                }
            }
        }

        if(dist < 100) {
            if(Math.random() < .1) {
                var entIds = [];
                var entInterps = [];
                var seqIds = [];

                for(var k in entities) {
                    entIds.push(entities[k].id);
                    entInterps.push(entities[k].interp);
                    seqIds.push(entities[k].sequenceId);
                }

                stream.write(p.clickPacket({
                    type: p.clickPacket.typeId,
                    from: 0,
                    entIds: entIds,
                    entInterps: entInterps,
                    seqIds: seqIds,
                    x: a[0],
                    y: a[1] + Math.random() * 50 - 25,
                    z: a[2],
                    x2: b[0],
                    y2: b[1],
                    z2: b[2]
                }));
            }
        }
    }

    var packet = p.makePacket(obj, p.inputPacket);
    stream.write(packet);

    setTimeout(runAI, 16);

    last = now;
}
