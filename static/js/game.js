
var Game = sh.Obj.extend({
    start: function(startTime) {
        this.startTime = startTime;
        messages.notify('Game has started!');

        $('#timer').show();
        this.updateTimer();

        var _this = this;
        this._interval = setInterval(function() { _this.updateTimer(); }, 1000);
    },

    end: function(obj) {
        clearInterval(this._interval);
        input.deactivate();
        messages.closeChat();

        this.showScores(obj.scores);

        var newgame = $('#scores .newgame');
        var i = 9;
        newgame.text('Next game starts in 10 seconds...');

        var ival = setInterval(function() {
            newgame.text('Next game starts in ' + i + ' seconds...');
            i--;

            if(i <= 0) {
                clearInterval(ival);
                window.location.href = '/' + obj.nextGameId;
            }
        }, 1000);
    },

    setFull: function(reason) {
        this.full = reason;

        $('#ingame .initialOverlay').hide();
        input.deactivate();

        var msg = $('#fullRoom');
        msg.show();
        msg.find('.' + reason).show();
    },

    isFull: function() {
        return this.reason;
    },

    showScores: function(obj) {
        var scores = $('#scores').show();
        var ul = $('<ul>');
        var sorted = [];

        // Ruh roh
        ul.append('<li class="header"><span>Name</span>' +
                  '<span>Kills</span><span>Deaths</span>' +
                  '<span class="total">Total</span></li>');

        for(var k in obj) {
            if(obj.hasOwnProperty(k)) {
                var data = obj[k];
                data.name = k;
                sorted.push(data);
            }
        }

        sorted.sort(function(v1, v2) {
            return (v1.kills - v1.deaths) < (v2.kills - v2.deaths);
        });

        sorted.forEach(function(obj) {
            var kills = obj.kills;
            var deaths = obj.deaths;

            ul.append('<li>' +
                      '<span>' + obj.name + '</span>' +
                      '<span>' + kills + '</span>' +
                      '<span>' + deaths + '</span>' +
                      '<span class="total">' + (kills - deaths) + '</span>' +
                      '</li>');
        });

        var container = scores.children('div');
        container.find('.results').append(ul);
        container.find('.winner span').text(sorted[0].name);
    },

    updateTimer: function() {
        function pad(n) {
            if(n < 10) {
                return '0' + n;
            }
            else {
                return n;
            }
        }

        var timer = $('#timer');
        var now = Date.now();
        var elapsed = Math.floor((now - this.startTime) / 1000.0);
        var left = (5 * 60) - elapsed;

        timer.text(Math.floor(left / 60.0) + ':' + pad(left % 60));
    }
});