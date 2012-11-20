
var Server = sh.Obj.extend({
    init: function() {
        var _this = this;
        var client = this.client = new BinaryClient('ws://' + location.host);
        this.events = {};

        client.on('open', function() {
            var stream = _this.stream = client.createStream();

            stream.on('data', function(data) {
                _this.handlePacket(data);
            });

            stream.on('error', function(err) {
                console.log(err);
            });
        });
    },

    handlePacket: function(buffer) {
        var obj = packets.parsePacket(buffer, packets.basePacket);

        switch(packets.getPacketDesc(obj.type)) {
        case packets.movePacket:
            obj = packets.parsePacket(buffer, packets.movePacket);
            this.fire('move', obj);
            break;
        case packets.newUserPacket:
            obj = packets.parsePacket(buffer, packets.newUserPacket);
            this.userId = obj.id;
            break;
        case packets.joinPacket:
            obj = packets.parsePacket(buffer, packets.joinPacket);
            this.fire('join', obj);
            break;
        case packets.leavePacket:
            obj = packets.parsePacket(buffer, packets.leavePacket);
            this.fire('leave', obj);
            break;
        }
    },

    on: function(type, func) {
        this.events[type] = func;
    },

    fire: function(type, obj) {
        if(this.events[type]) {
            this.events[type](obj);
        }
    },

    sendMove: function(x, y) {
        var obj = { type: packets.movePacket.typeId, from: 0,
                    x: x, y: y };
        var p = packets.makePacket(obj, packets.movePacket);
        this.stream.write(p);
    }
});