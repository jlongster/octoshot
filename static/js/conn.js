
var Server = sh.Obj.extend({
    init: function() {
        var _this = this;
        var client = this.client = new BinaryClient('ws://' + location.host);

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
            console.log(obj.x, obj.y);
            break;
        }
    },

    sendMove: function(x, y) {
        var obj = { type: packets.movePacket.typeId, from: 0,
                    x: x, y: y };
        var p = packets.makePacket(obj, packets.movePacket);
        this.stream.write(p);
    }
});