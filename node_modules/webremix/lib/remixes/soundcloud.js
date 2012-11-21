'use strict';

// Generate Soundcloud iframe
var SERVICE_SOUNDCLOUD = /soundcloud\.com\/[A-Z0-9-_]+\/[A-Z0-9-_]+/gi;
var request = require('request');
var qs = require('querystring');

exports.process = function(media, remix, callback) {
  process.nextTick(function() {
    if (!remix.isMatched &&  media.match(SERVICE_SOUNDCLOUD)) {
      var params = {
        format: 'json',
        url: media
      };

      request.get('http://soundcloud.com/oembed?' + qs.stringify(params), function(err, resp, body) {
        if (err) {
          callback(null, remix);

        } else {
          try {
            var jsonResp = JSON.parse(body);
            if (jsonResp.html) {
              remix.isMatched = true;
              jsonResp.html = jsonResp.html.replace(/src="http:/, 'src="');
              remix.result = '<div class="object-wrapper">' + jsonResp.html + '</div>';
              callback(null, remix);
            } else {
              callback(null, remix);
            }
          } catch(error) {
            callback(null, remix);
          }
        }
      });

    } else {
      callback(null, remix);
    }
  });
};
