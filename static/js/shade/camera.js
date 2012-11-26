
sh.Camera = sh.SceneNode.extend({
    init: function(target) {
        this.parent();
        this.target = target;
        this.inverseTransform = mat4.create();
    },

    update: function(dt) {
        this.target.update(dt);
    },

    updateMatrices: function() {
        var target = this.target;
        var dirty = target._dirty;
        target.updateMatrices();

        if(dirty) {
            mat4.inverse(target._realTransform, this.inverseTransform);
        }
    }
});
