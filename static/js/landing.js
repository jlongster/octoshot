$(function() {
    $('#intro button.play-start').click(function() {
        var name = 'game' + Math.floor(Math.random() * 100000);
        window.location.href = '/' + name;
    });

    $('#intro button.play-find').click(function() {
        window.location.href = '/find';
    });

});