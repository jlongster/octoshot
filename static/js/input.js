(function() {

    var pressedKeys = {};
    var pressedOnceKeys = {};
    var specialKeys = {
        32: 'SPACE',
        37: 'LEFT',
        38: 'UP',
        39: 'RIGHT',
        40: 'DOWN',
        27: 'ESC'
    };
    var lastMouse;
    var curMouse;
    var movement = [0, 0];
    var events = {};
    var modifier = false;

    function onKeyDown(e) {
        if(e.altKey || e.shiftKey || e.ctrlKey || e.metaKey) {
            modifier = true;
        }
        else {
            setKey(e, true);
        }
    }

    function onKeyUp(e) {
        if(e.altKey || e.shiftKey || e.ctrlKey || e.metaKey) {
            modifier = false;
        }
        else {
            setKey(e, false);
        }
    }

    var down = false;
    var clicked = false;
    var accessed = false;
    function onMouseDown(e) {
        down = true;
        lastMouse = [e.pageX, e.pageY];
        curMouse = [e.pageX, e.pageY];
    }

    function onMouseMove(e) {
        var movementX = e.movementX ||
            e.mozMovementX ||
            e.webkitMovementX;
        var movementY = e.movementY ||
            e.mozMovementY ||
            e.webkitMovementY;

        if(movementX || movementY) {
            movement = [movementX || 0, movementY || 0];
        }
        else {
            if(!curMouse) {
                lastMouse = [e.pageX, e.pageY];
                curMouse = [e.pageX, e.pageY];
            }

            lastMouse = curMouse;
            curMouse = [e.pageX, e.pageY];
            movement = [curMouse[0] - lastMouse[0],
                        curMouse[1] - lastMouse[1]];
        }

        accessed = false;
    }

    function onMouseUp(e) {
        down = false;
        clicked = true;
    }

    function reset() {
        clicked = false;
    }

    function on(key, func) {
        key = key.toUpperCase();

        if(!events[key]) {
            events[key] = [];
        }

        events[key].push(func);
    }

    function fire(key) {
        if(events[key]) {
            events[key].forEach(function(func) {
                func(key);
            });
        }
    }

    function setKey(event, status) {
        var code = event.keyCode;
        var k;

        if(code in specialKeys) {
            event.preventDefault();
            k = specialKeys[code];
        }
        else if(code < 128) {
            if(!modifier) {
                event.preventDefault();
            }
            k = String.fromCharCode(code);
        }
        else {
            return;
        }

        if(!pressedKeys[k] && status) {
            fire(k);
            pressedOnceKeys[k] = status;
        }

        pressedKeys[k] = status;
    }

    function isDown(key) {
        return pressedKeys[key.toUpperCase()];
    }

    function isPressed(key) {
        key = key.toUpperCase();
        var pressed = pressedOnceKeys[key];
        pressedOnceKeys[key] = false;
        return pressed;
    }

    function isMouseDown() {
        return down;
    }

    function isMouseClicked() {
        return clicked;
    }

    function getMouseMoved() {
        if(!accessed) {
            accessed = true;
            return movement;
        }

        return [0, 0];
    }

    function activate() {
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    function deactivate() {
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        document.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    window.input = {
        activate: activate,
        deactivate: deactivate,
        isDown: isDown,
        isPressed: isPressed,
        isMouseDown: isMouseDown,
        isMouseClicked: isMouseClicked,
        getMouseMoved: getMouseMoved,
        on: on,
        reset: reset
    };
})();