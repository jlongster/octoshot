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

function initAI() {
    var obj = {
        type: p.inputPacket.typeId,
        from: 0,
        dt: .25,
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
        dt: 2.5,
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

    var obj = {
        type: p.inputPacket.typeId,
        from: 0,
        dt: Math.random() / 20,
        sequenceId: id++,
        mouseX: -1,
        mouseY: 0,
        mouseDown: 0,
        left: 0,
        right: 0,
        up: 0,
        down: 0
    };

    var packet = p.makePacket(obj, p.inputPacket);
    stream.write(packet);

    obj = {
        type: p.inputPacket.typeId,
        from: 0,
        dt: Math.random() / 40,
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

    setTimeout(runAI, 16);

    last = now;
}
