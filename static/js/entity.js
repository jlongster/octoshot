
(function(SceneNode) {

    var Entity = SceneNode.extend({
        init: function() {
            this.parent.apply(this, arguments);
        }
    });

    if(typeof module !== 'undefined') {
        module.exports = Entity;
    }
    else {
        window.Player = Entity;
    }

})(typeof module !== 'undefined' ?
   require('./node-shade').SceneNode :
   sh.SceneNode);