'use strict';

var remix = require('./lib/remix');

exports.generate = function(content, options, callback) {
  var contentArr = content.split(/\s/);
  var finalContent = [];

  if (!callback) {
    callback = options;
    options = {};
  }

  contentArr.forEach(function(content, idx) {
    process.nextTick(function() {
      remix.process(content, options, function(err, resp) {
        if (err) {
          callback(err);

        } else {
          finalContent.push({ id: idx, message: resp });
        }

        if (finalContent.length === contentArr.length) {
          var messageArr = [];

          finalContent = finalContent.sort(function(a, b) {
            return parseInt(a.id, 10) - parseInt(b.id, 10);
          });

          finalContent.forEach(function(m) {
            messageArr.push(m.message);
          });

          callback(null, messageArr.join(' '));
        }
      });
    });
  });
};
