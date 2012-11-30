(function() {
    function handleCommand(cmd) {
        if(cmd[0] != '/') {
            return false;
        }

        // Scrub scrub scrub
        var val = cmd;
        val = val.replace(/\s+/g, ' ');
        val = val.replace(/(^\s*|\s*$)/g, '');

        var parts = val.slice(1).split(' ');
        cmd = parts[0];
        var args = parts.slice(1).join(' ');

        // if(cmd == 'god') {
        //     player.toggleGod();
        //     printMessage('God mode is ' + (player.isGod ? 'on' : 'off'),
        //                  '',
        //                  function(msg, name) {
        //                      return '<div>' + msg + '</div>';
        //                  });
        // }

        server.command(cmd, args);
        return true;
    }

    function notify(msg) {
        var n = $('#notification');
        var all = n.children('.message');

        if(all.length > 2) {
            all.first().remove();
        }

        var el = $('<div class="message">' + msg + '</div>');
        n.append(el);
        el.addClass('open');

        setTimeout(function() {
            el.removeClass('open');
        }, 1000);
    }

    function printMessage(msg, name, format) {
        var messages = $('#messages');
        var chat = $('#chat');
        var closed = chat.is('.closed');

        if(messages.children().length > 50) {
            messages.children().first().remove();
        }

        format = format || function(msg, name) {
            return '<div class="' + name + '">' +
                '<span class="name">&lt;' + name + '&gt;</span> ' +
                msg + '</div>';
        };

        // Scrub the name. The message part is trusted from the
        // server.
        name = name.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        if(name == 'server') {
            msg = msg.replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/ /g, '&nbsp;')
                .replace(/\n/g, '<br />');

        }

        var formatted = format(msg, name);
        messages.append(formatted);
        messages[0].scrollTop = 100000;

        if(closed && name != 'server') {
            notify(formatted);
        }
    }

    function init() {
        var el = $('#message-input');

        input.on('F1', function(e) {
            var chat = $('#chat');
            chat.toggleClass('closed');

            if(chat.is('.closed')) {
                chat.find('.type input').blur();
            }
            else {
                chat.find('.type input').focus();
            }

            e.preventDefault();
            e.stopPropagation();
        });

        el.on('keydown', function(e) {
            if(e.keyCode != 112) {
                e.stopPropagation();
            }

            if(e.keyCode == 13) {
                var val = el.val();

                if(val !== '') {
                    if(!handleCommand(val)) {
                        server.sendMessage(val);
                    }
                    el.val('');
                }
            }
        });

        server.on('message', function(obj) {
            printMessage(obj.message, obj.name);
        });

        server.on('cmdRes', function(obj) {
            switch(obj.method) {
            case 'users':
            case 'names':
                printMessage('Users: '  + obj.res.join(' '), 'server');
                break;
            case 'me':
                printMessage(obj.res, '', function(msg, name) {
                    return '<div class="me">' + msg + '</div>';
                });
            }
        });

        $('#messages').height(renderer.height - $('#chat .type').height());
    }

    window.messages = {
        init: init,
        notify: notify
    };
})();