'use strict';

var remix = require('./lib/remix');

exports.generate = function(content, options, callback) {
  var contentArr = content.split(/\s/);
  var finalContent = [];

  if (!callback) {
    callback = options;
    options = {};
  }

  for (var i = 0; i < contentArr.length; i ++) {
    remix.process(contentArr[i], options, function(err, resp) {
      if (err) {
        callback(err);

      } else {
        finalContent.push(resp);
      }

      if (finalContent.length === contentArr.length) {
        callback(null, finalContent.join(' '));
      }
    });
  }
};
