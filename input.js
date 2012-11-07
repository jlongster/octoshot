
var pressedKeys = {};
var specialKeys = {
    37: 'LEFT',
    38: 'UP',
    39: 'RIGHT',
    40: 'DOWN'
};
var lastMouse;
var curMouse;

document.addEventListener('keydown', function(e) {
    setKey(e, true);
});

document.addEventListener('keyup', function(e) {
    setKey(e, false);
});

var down = false;
var accessed = false;
document.addEventListener('mousedown', function(e) {
    down = true;
    lastMouse = [e.pageX, e.pageY];
    curMouse = [e.pageX, e.pageY];
});

document.addEventListener('mousemove', function(e) {
    if(!curMouse) {
        lastMouse = [e.pageX, e.pageY];
        curMouse = [e.pageX, e.pageY];
    }

    if(down) {
        lastMouse = curMouse;
        curMouse = [e.pageX, e.pageY];
        accessed = false;
    }
});

document.addEventListener('mouseup', function(e) {
    down = false;
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


function getMouseMoved() {
    if(curMouse && !accessed) {
        accessed = true;
        return [curMouse[0] - lastMouse[0],
                curMouse[1] - lastMouse[1]];
    }

    return [0, 0];
}
