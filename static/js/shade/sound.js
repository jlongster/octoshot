
sh.Sound = sh.Obj.extend({
    init: function(audio) {
        this.audio = audio;
    },

    play: function(volume) {
        this.audio.volume = volume || 1;
        this.audio.play();
        this.audio.currentTime = 0;
    }
});

// Freak.

// .

// ..

// This is insane.

sh.AudioDataSound = sh.Sound.extend({
    init: function() {
        this.buffers = [];
    },

    setup: function(channels, sampleRate, bufferLength) {
        this.channels = channels;
        this.sampleRate = sampleRate;
        this.bufferLength = bufferLength;
    },

    load: function(buffer) {
        this.buffers.push(buffer);
    },

    play: function(volume) {
        try {
            var audio = new Audio();
            audio.mozSetup(this.channels, this.sampleRate);
            audio.autoplay = true;
            audio.muted = false;
            audio.volume = volume || 1;
            this.audio = audio;

            var bufs = this.buffers;
            for(var i=0, l=bufs.length; i<l; i++) {
                audio.mozWriteAudio(bufs[i]);
            }
        }
        catch(e) {}
    }
});

sh.WebAudioSound = sh.Sound.extend({
    init: function(data) {
        if(!sh.WebAudioSound.context) {
            sh.WebAudioSound.context = new webkitAudioContext();
        }

        if(sh.WebAudioSound.context) {
            this.buffer = sh.WebAudioSound.context.createBuffer(data, false);
        }
    },

    play: function(volume) {
        var ctx = sh.WebAudioSound.context;

        if(ctx) {
            var source = ctx.createBufferSource();
            var gain = ctx.createGainNode();
            source.buffer = this.buffer;
            source.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.value = volume || 1;

            source.noteOn(0);
        }
    }
});

