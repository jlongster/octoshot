
sh.Resources = sh.Obj.extend({
    init: function() {
        this.resourceCache = new Array(1000);
        this.readyCallbacks = [];
        this._gltextures = {};
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
            else if(ext == 'ogg' || ext == 'mp3' || ext == 'wav') {
                loader = this.loadSound;
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

    xhrGet: function(url, then, responseField, responseType) {
        var req = new XMLHttpRequest();
        req.open('GET', url, true);

        req.addEventListener('load', function() {
            if(req.status === 200 || req.status === 0) {
                then(req[responseField || 'responseText']);
            }
            else {
                _this.onFailure(url);
            }
        }, false);

        req.addEventListener('error', function(err) {
            _this.onFailure(url);
        }, false);

        if(responseType) {
            req.responseType = responseType;
        }

        req.send();
    },

    xhrGetBuffer: function(url, then) {
        this.xhrGet(url, then, 'response', 'arraybuffer');
    },

    loadMesh: function(url, attribArrays) {
        this.xhrGet(url, function(src) {
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

        this.xhrGet(url, function(src) {
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

    loadSound: function(url) {
        var _this = this;

        // Argh audio, the scourge of the earth ye
        if('webkitAudioContext' in window) {
            this.xhrGetBuffer(url, function(buffer) {
                _this.onLoaded(url, new sh.WebAudioSound(buffer));
            });
        }
        else {
            // I will plunder ye village and burn ye homes to da ground
            var audio = new Audio();
            var sound;

            if(audio.mozSetup) {
                sound = new sh.AudioDataSound();

                audio.addEventListener('MozAudioAvailable', function(e) {
                    sound.load(e.frameBuffer);
                }, false);

                audio.addEventListener('loadedmetadata', function(e) {
                    sound.setup(audio.mozChannels,
                                audio.mozSampleRate,
                                audio.mozFrameBufferLength);
                }, false);
            }
            else {
                sound = new sh.Sound(audio);
            }

            audio.muted = true;
            audio.src = url;
            audio.play();
            
            // I can't find an event that loads when the sound is
            // fully completed, so just go ahead
            _this.onLoaded(url, sound);
        }
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

        console.log('loading ' + url);
        img.src = url;
    },

    uploadImage: function(img) {
        if(typeof img === 'string') {
            console.log(img);
            img = this.get(img);
        }

        if(this._gltextures[img.src]) {
            return this._gltextures[img.src];
        }

        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

        this._gltextures[img.src] = tex;
        return tex;
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