'use strict';

// Generate Rdio iframe
var SERVICE_RDIO = /(((rdio\.com)|(rd\.io))\/[A-Z0-9-_]+\/[A-Z0-9-_]+)/gi;

exports.process = function(media, remix, options) {
  if (!remix.isMatched && media.match(SERVICE_RDIO)) {
    var url = media.split('/');
    var rdioId = url[url.length -1];

    try {
      remix.isMatched = true;
      remix.result = '<div class="object-wrapper"><iframe class="rdio" width="' + options.width +
        '" height="' + options.height + '" src="//rd.io/i/' + rdioId + '" frameborder="0"></iframe></div>';

      return remix;

    } catch(err) {
      return remix;
    }
  }
  return remix;
};
