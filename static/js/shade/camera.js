
sh.Camera = sh.SceneNode.extend({
    init: function(target) {
        this.parent();
        this.target = target;
        this.inverseTransform = mat4.create();
    },

    updateMatrices: function() {
        this.target.updateMatrices();
        mat4.inverse(this.target._realTransform, this.inverseTransform);
    }
});
