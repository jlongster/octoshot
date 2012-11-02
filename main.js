(function (exports) {
  var requestAnimFrame = function () {
      return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function (callback) {
        window.setTimeout(callback, 1000 / 60 | 0);
      };
    }();
  var resources = new Resources();
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  var stats;
  var IMG_BOSSES = 0;
  function heartbeat() {
    stats.begin();
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    stats.end();
    requestAnimFrame(heartbeat);
  }
  window.addEventListener('load', function () {
    stats = new Stats();
    stats.setMode(1);
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.right = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);
    resources.load(IMG_BOSSES, 'resources/bosses.png');
    resources.onReady(heartbeat);
  });
}.call(this, typeof exports === 'undefined' ? main_ljs = {} : exports));
