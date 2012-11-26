var BinaryClient = require('binaryjs').BinaryClient;
var p = require('./static/js/packets');

var client = new BinaryClient('ws://localhost:4000');
var stream;

client.on('open', function() {
    stream = client.createStream();

    stream.on('data', function(data) {
        handlePacket(data);
    });

    stream.on('error', function(err) {
        console.log(err);
    });

    initAI();
    runAI();
});

function handlePacket(packet) {
    if(packet instanceof Buffer) {
        packet = p.parsePacket(packet, p.basePacket);
    }
    else {
        packet = p.objectifyPacket(packet);
    }

    switch(p.getPacketDesc(packet.type)) {
    default:
        // do nothing right now
        break;
    }
}

// AI

var bot;

function Bot() {
    this.x = 50;
    this.y = 50;
    this.angle = 0;
}

function initAI() {
    bot = new Bot();

    var obj = {
        type: p.inputPacket.typeId,
        from: 0,
        dt: 2.0,
        sequenceId: id++,
        mouseX: 0,
        mouseY: 0,
        mouseDown: 0,
        left: 1,
        right: 0,
        up: 0,
        down: 0
    };

    var packet = p.makePacket(obj, p.inputPacket);
    stream.write(packet);

    obj = {
        type: p.inputPacket.typeId,
        from: 0,
        dt: 3.0,
        sequenceId: id++,
        mouseX: 0,
        mouseY: 0,
        mouseDown: 0,
        left: 0,
        right: 0,
        up: 1,
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

    // bot.angle += Math.PI / 4 * dt;
    // bot.x = Math.sin(bot.angle) * 100 * Math.sin(bot.angle) + 200;
    // bot.y = Math.cos(bot.angle) * 100 + 200;

    // var obj = { type: p.movePacket.typeId,
    //             from: 0,
    //             x: bot.x,
    //             y: bot.y };
    // var packet = p.makePacket(obj, p.movePacket);
    // stream.write(packet);

    var obj = {
        type: p.inputPacket.typeId,
        from: 0,
        dt: dt,
        sequenceId: id++,
        mouseX: 0,
        mouseY: 0,
        mouseDown: 0,
        left: 1,
        right: 0,
        up: 1,
        down: 0
    };

    var packet = p.makePacket(obj, p.inputPacket);
    stream.write(packet);

    setTimeout(runAI, 16);

    last = now;
}
