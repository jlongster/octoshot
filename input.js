
var pressedKeys = {};
var specialKeys = {
    37: 'LEFT',
    38: 'UP',
    39: 'RIGHT',
    40: 'DOWN'
};

document.addEventListener('keydown', function(e) {
    setKey(e, true);
});

document.addEventListener('keyup', function(e) {
    setKey(e, false);
});

function setKey(event, status) {
    var code = event.keyCode;

    if(code in specialKeys) {
        pressedKeys[specialKeys[code]] = status;
    }
    else {
        pressedKeys[String.fromCharCode(code)] = status;
    }
}

function isDown(key) {
    return pressedKeys[key.toUpperCase()];
}
