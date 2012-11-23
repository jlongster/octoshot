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

        server.command(cmd, args);
        return true;
    }

    function printMessage(msg, name, format) {
        var messages = $('#messages');

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

        messages.append(format(msg, name));
        messages[0].scrollTop = 100000;
    }

    function init() {
        var el = $('#message-input');

        input.on('t', function() {
            var chat = $('#chat');
            chat.removeClass('closed');
            chat.find('.type input').focus();
        });

        input.on('esc', function() {
            var chat = $('#chat');
            chat.addClass('closed');
            chat.find('.type input').blur();
        });

        el.on('keydown', function(e) {
            if(e.keyCode != 27) {
                e.stopPropagation();
            }

            if(e.keyCode == 13) {
                var val = el.val();

                if(!handleCommand(val)) {
                    server.sendMessage(val);
                }
                el.val('');
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
    }

    window.messages = {
        init: init
    };
})();