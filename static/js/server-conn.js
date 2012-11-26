
var ServerConnection = sh.Obj.extend({
    init: function() {
        var _this = this;
        var client = this.client = new BinaryClient('ws://' + location.host);
        this.sequence = 0;
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

    handlePacket: function(packet) {
        var obj;

        if(packet instanceof ArrayBuffer) {
            obj = packets.parsePacket(packet, packets.basePacket);
        }
        else {
            obj = packets.objectifyPacket(packet);
        }

        switch(packets.getPacketDesc(obj.type)) {
        case packets.statePacket:
            obj = packets.parsePacket(packet, packets.statePacket);
            this.fire('state', obj);
            break;
        case packets.joinPacket:
            obj = packets.parsePacket(packet, packets.joinPacket);
            this.fire('join', obj);
            break;
        case packets.leavePacket:
            this.fire('leave', obj);
            break;
        case packets.newUserPacket:
            this.userId = obj.id;
            this.username = obj.name;
            this.fire('newUser', obj);
            break;
        case packets.messagePacket:
            this.fire('message', obj);
            break;
        case packets.cmdResPacket:
            this.fire('cmdRes', obj);
        }
    },

    on: function(type, func) {
        if(this.events[type] === undefined) {
            this.events[type] = [];
        }

        this.events[type].push(func);
    },

    fire: function(type, obj) {
        if(this.events[type]) {
            this.events[type].forEach(function(func) {
                func(obj);
            });
        }
    },

    sendInput: function(input) {
        if(this.stream) {
            input.type = packets.inputPacket.typeId;
            input.from = 0;
            var p = packets.makePacket(input, packets.inputPacket);
            this.stream.write(p);
        }
    },

    sendMessage: function(msg) {
        this.stream.write(packets.messagePacket({
            type: packets.messagePacket.typeId,
            from: this.userId,
            name: this.username,
            message: msg
        }));
    },

    sendNameChange: function(name) {
        this.stream.write(packets.nameChangePacket({
            type: packets.nameChangePacket.typeId,
            from: this.userId,
            name: name
        }));
    },

    command: function(method, args) {
        args = args || null;

        this.stream.write(packets.cmdPacket({
            type: packets.cmdPacket.typeId,
            from: this.userId,
            method: method,
            args: args
        }));        
    }
});