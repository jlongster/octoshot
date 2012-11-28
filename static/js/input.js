(function() {

    var pressedKeys = {};
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
    var events = {};
    var modifier = false;

    document.addEventListener('keydown', function(e) {
        if(e.altKey || e.shiftKey || e.ctrlKey || e.metaKey) {
            modifier = true;
        }
        else {
            setKey(e, true);
        }
    });

    document.addEventListener('keyup', function(e) {
        if(e.altKey || e.shiftKey || e.ctrlKey || e.metaKey) {
            modifier = false;
        }
        else {
            setKey(e, false);
        }
    });

    var down = false;
    var clicked = false;
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

        if(curMouse[0] - lastMouse[0] === 0 &&
           curMouse[1] - lastMouse[1] === 0) {
            clicked = true;
        }
    });

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
        }

        pressedKeys[k] = status;
    }

    function isDown(key) {
        return pressedKeys[key.toUpperCase()];
    }

    function isMouseDown() {
        return down;
    }

    function isMouseClicked() {
        return clicked;
    }

    function getCurMouse() {
        return curMouse;
    }

    function getMouseMoved() {
        if(curMouse && !accessed) {
            accessed = true;
            return [curMouse[0] - lastMouse[0],
                    curMouse[1] - lastMouse[1]];
        }

        return [0, 0];
    }

    window.input = {
        isDown: isDown,
        isMouseDown: isMouseDown,
        isMouseClicked: isMouseClicked,
        getMouseMoved: getMouseMoved,
        getCurMouse: getCurMouse,
        on: on,
        reset: reset
    };
})();