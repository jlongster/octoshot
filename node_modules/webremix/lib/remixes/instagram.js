'use strict';

// Generate image link
var SERVICE_INSTAGRAM = /(((instagr\.am)|(instagram\.com))\/\w\/\w+)/i;

exports.process = function(media, remix) {
  if (!remix.isMatched && media.match(SERVICE_INSTAGRAM)) {
    var parts = media.split('/');
    var shortcode = parts[parts.length - 2];

    remix.isMatched = true;

    remix.result = '<div class="image-wrapper"><a href="' + media + '">' +
      '<img src="http://instagr.am/p/' + shortcode + '/media/"/></a></div>';
  }

  return remix;
};
