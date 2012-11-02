
function Resources() {
    this.resourceCache = new Array(1000);
    this.readyCallbacks = [];
}

Resources.prototype.load = function(id, url) {
    if(this.resourceCache[id] === undefined) {
        var img = new Image();
        var _this = this;

        img.onload = function() {
            _this.resourceCache[id] = img;

            if(_this.isReady()) {
                _this.readyCallbacks.forEach(function(func) {
                    func();
                });
                _this.readyCallbacks = [];
            }
        };
        img.onerror = function(err) {
            console.log('failed to load resources: ' + url);
        };
        this.resourceCache[id] = false;
        img.src = url;
    }
};

Resources.prototype.get = function(id) {
    return this.resourceCache[id];
};

Resources.prototype.isReady = function() {
    var ready = true;
    for(var k in this.resourceCache) {
        if(!this.resourceCache[k]) {
            ready = false;
        }
    }
    return ready;
};

Resources.prototype.onReady = function(func) {
    if(this.isReady()) {
        func();
    }
    else {
        this.readyCallbacks.push(func);
    }
};
