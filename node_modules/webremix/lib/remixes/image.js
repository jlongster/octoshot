'use strict';

// Generate image link
var SERVICE_IMAGE = /((http|https):\/\/)?(\S)+\.(jpg|jpeg|png|gif)($|(#|\?))/gi;

exports.process = function(media, remix) {
  if (!remix.isMatched && media.match(SERVICE_IMAGE)) {
    remix.isMatched = true;
    remix.result = '<div class="image-wrapper"><a href="' + media + '" target="_blank">' +
      '<img src="' + media + '"></a></div>';
  }

  return remix;
};
