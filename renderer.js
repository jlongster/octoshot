
function Renderer(camera) {
    this.objects = [];
    this.camera = camera;
    this.mat4 = mat4.create();
}

Renderer.prototype.init = function() {
    this.defaultProgram = createProgram('default',
                                        getShader('default-vertex'),
                                        getShader('default-fragment'));
};

Renderer.prototype.addObject = function(obj) {
    this.objects.push(obj);
};

Renderer.prototype.update = function(dt) {
    this.camera.update(dt);

    this.objects.forEach(function(o) {
        if(o.update) {
            o.update(dt);
        }
    }, this);
};

Renderer.prototype.render = function() {
    this.objects.forEach(function(obj) {
        mat4.set(this.camera.transform, this.mat4);
        this.renderObject(obj);
    }, this);
};

Renderer.prototype.renderObject = function(obj) {
    var prev = this.mat4;
    var mat = mat4.create();

    if(!obj.program) {
        obj.program = this.defaultProgram;
    }

    gl.useProgram(obj.program);
    mat4.multiply(prev, obj.transform, mat);
    gl.uniformMatrix4fv(gl.getUniformLocation(obj.program, "transform"), false, mat);

    obj.render();

    if(obj.children) {
        obj.children.forEach(function(child) {
            this.renderObject(child);
        }, this);
    }

    this.mat4 = prev;
};
