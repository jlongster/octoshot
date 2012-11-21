'use strict';

var request = require('request');

// See if this url exists
exports.process = function(media, remix, callback) {
  request({
    method: 'HEAD',
    url: media,
    followAllRedirects: false }, function (err, resp) {
      if (err) {
        callback(null, media);

      } else {
        remix.isMatched = true;
        remix.result = '<a href="' + media + '">' + media + '</a>';
        callback(null, remix.result);
      }
  });
};
