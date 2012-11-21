'use strict';

var matchYoutube = require('./remixes/youtube');
var matchVimeo = require('./remixes/vimeo');
var matchSoundCloud = require('./remixes/soundcloud');
var matchMixCloud = require('./remixes/mixcloud');
var matchRdio = require('./remixes/rdio');
var matchImage = require('./remixes/image');
var matchInstagram = require('./remixes/instagram');
var matchLink = require('./remixes/link');

var DEFAULT_VIDEO_HEIGHT = 295;
var DEFAULT_VIDEO_WIDTH = 525;

var escapeHtml = function(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

/* Pattern match for the embedded media
 * Requires: media string
 * Returns: embedded media or the original string if nothing matches
 */
var checkRemixes = function(media, remix, options, callback) {
  remix = matchYoutube.process(media, remix,
          { width: options.width || DEFAULT_VIDEO_WIDTH, height: options.height || DEFAULT_VIDEO_HEIGHT });
  remix = matchRdio.process(media, remix,
          { width: options.width || DEFAULT_VIDEO_WIDTH, height: options.height || DEFAULT_VIDEO_HEIGHT });
  remix = matchVimeo.process(media, remix,
          { width: options.width || DEFAULT_VIDEO_WIDTH, height: options.height || DEFAULT_VIDEO_HEIGHT });
  remix = matchImage.process(media, remix);
  remix = matchInstagram.process(media, remix);

  if (!remix.isMatched) {
    matchLink.process(media, remix, function(err, result) {
      if (err) {
        callback(err);
      } else {
        callback(null, result);
      }
    });
  } else {
    callback(null, remix.result);
  }
};

/* Embed media if it matches any of the following:
 * 1. Is a Youtube link
 * 2. Is a Vimeo link
 * 3. Is an Rdio link
 * 4. Is an Instagram link
 * 5. Is a Mixcloud link
 * 6. Is a url with a jpg|jpeg|png|gif extension
 * 7. Is a regular link
 *
 * Requires: media string, callback
 * Returns: embedded media or the original string if nothing matches
 */
exports.process = function(media, options, callback) {
  if (!media) {
    callback(null, '');

  } else {
    media = escapeHtml(media);

    process.nextTick(function() {
      var remix = {
        isMatched: false,
        result: media
      };

      matchSoundCloud.process(media, remix, function(errSndCld, remix) {
        if (errSndCld) {
          callback(errSndCld);

        } else {
          if (!remix.isMatched) {
            matchMixCloud.process(media, remix, function(errMixCld, remix) {
              if (errMixCld) {
                callback(errMixCld);

              } else {
                if (!remix.isMatched) {
                  checkRemixes(media, remix, options, callback);

                } else {
                  callback(null, remix.result);
                }
              }
            });

          } else {
            callback(null, remix.result);
          }
        }
      });
    });
  }
};
