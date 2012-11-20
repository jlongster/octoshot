
function initMessages() {
    var input = document.getElementById('message-input');
    var messages = $('#messages');

    function handleCommand(cmd) {
        if(cmd[0] != '/') {
            return false;
        }

        var parts = input.value.slice(1).split(' ');
        cmd = parts[0];
        var args = parts.slice(1);

        switch(cmd) {
        case 'nick':
            server.sendNameChange(args[0]);
            return true;
        }

        return false;
    }

    input.onkeydown = function(e) {
        e.stopPropagation();

        if(e.keyCode == 13) {
            var val = input.value;

            if(!handleCommand(val)) {
                server.sendMessage(val);
            }
            input.value = '';
        }
    };

    server.on('message', function(obj) {
        if(messages.children().length > 100) {
            messages.children().first().remove();
        }

        var str = obj.message.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        messages.append('<div><span class="name">&lt;' + obj.name + '&gt;</span> '
                        + str + '</div>');
        messages[0].scrollTop = 100000;
    });
}