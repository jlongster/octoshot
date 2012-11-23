
sh.Resources = sh.Obj.extend({
    init: function() {
        this.resourceCache = new Array(1000);
        this.readyCallbacks = [];
    },

    load: function(urlOrArr) {
        if(urlOrArr instanceof Array) {
            urlOrArr.forEach(function(url) {
                this._load(url);
            }, this);
        }
        else {
            this._load(urlOrArr);
        }
    },

    _load: function(url /* , loader args */) {
        var args = Array.prototype.slice.call(arguments);

        if(this.resourceCache[url] === undefined) {
            var matches = url.match(/\.([^\.]*)$/);
            var ext = matches[1];
            this.resourceCache[url] = false;
            var loader;

            if(ext == 'mesh') {
                loader = this.loadMesh;
            }
            else if(ext == 'vsh') {
                loader = this.loadVertexShader;
            }
            else if(ext == 'fsh') {
                loader = this.loadFragmentShader;
            }
            else {
                loader = this.loadImage;
            }

            loader.apply(this, args);
        }
    },

    onLoaded: function(url, obj) {
        this.resourceCache[url] = obj;

        if(this.isReady()) {
            this.readyCallbacks.forEach(function(func) {
                func();
            });
            this.readyCallbacks = [];
        }
    },

    onFailure: function(url) {
        console.log('failed to load resource: ' + url);
    },

    loadText: function(url, then) {
        var req = new XMLHttpRequest();
        var _this = this;

        req.onload = function() {
            if(req.status === 200 || req.status === 0) {
                then(req.responseText);
            }
        };

        req.onerror = function(err) {
            _this.onFailure(url);
        };

        req.open('GET', url, true);
        req.send(null);
    },

    loadMesh: function(url, attribArrays) {
        this.loadText(url, function(src) {
            var mesh = sh.util.decompressSimpleMesh(src, attribArrays);
            _this.onLoaded(url, mesh);
        });
    },

    loadVertexShader: function(url) {
        this._loadShader(url, gl.VERTEX_SHADER);
    },

    loadFragmentShader: function(url) {
        this._loadShader(url, gl.FRAGMENT_SHADER);
    },

    _loadShader: function(url, type) {
        var _this = this;

        this.loadText(url, function(src) {
            var shader = gl.createShader(type);
            gl.shaderSource(shader, src);
            gl.compileShader(shader);

            var status = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
            if(!status) {
                var err = gl.getShaderInfoLog(shader);
                gl.deleteShader(shader);
                throw new Error('shader compilation error (' + url + '): ' + err);
            }

            _this.onLoaded(url, shader);
        });
    },

    loadImage: function(url) {
        var img = new Image();
        var _this = this;

        img.onload = function() {
            _this.onLoaded(url, img);
        };
        img.onerror = function(err) {
            _this.onFailure(url);
        };

        img.src = url;
    },

    get: function(url) {
        return this.resourceCache[url];
    },

    isReady: function() {
        var ready = true;
        for(var k in this.resourceCache) {
            if(!this.resourceCache[k]) {
                ready = false;
            }
        }
        return ready;
    },

    onReady: function(func) {
        if(this.isReady()) {
            func();
        }
        else {
            this.readyCallbacks.push(func);
        }
    }
});