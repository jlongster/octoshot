
var socket = new WebSocket('ws://' + location.host);

socket.onopen = function() {
};

socket.onmessage = function(e) {
    console.log(e.data);
};
