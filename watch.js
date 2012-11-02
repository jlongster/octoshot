#!/usr/bin/env node

var fs = require('fs');
var spawn = require('child_process').spawn;
var files = ['main.ljs'];

files.forEach(function(name) {
    fs.watchFile('main.ljs', function() {
        console.log('compiling...');

        spawn('growlnotify', ['LLJS', '-m ' + name + ' has finished compiling']);
        spawn('make');
    });
});