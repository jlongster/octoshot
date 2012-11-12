
function Renderer() {
    this.root = null;
}

Renderer.prototype.init = function() {
    createProgram('default',
                  getShader('default-vertex'),
                  getShader('default-fragment'));
};

Renderer.prototype.setRoot = function(obj) {
    this.root = obj;
};

Renderer.prototype.update = function(dt) {
    this.updateObject(this.root, dt);
};

Renderer.prototype.updateObject = function(obj, dt) {
    obj.update(dt);
    obj.children.forEach(function(child) {
        this.updateObject(child, dt);
    }, this);
};

Renderer.prototype.render = function() {
    this.renderObject(this.root);
};

Renderer.prototype.renderObject = function(obj) {
    var _dirty = obj._dirty;

    obj.prerender();
    obj.render();
    obj.children.forEach(function(child) {
        if(_dirty) {
            child._dirty = true;
        }

        this.renderObject(child);
    }, this);
};
