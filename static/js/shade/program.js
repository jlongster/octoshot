
sh.Program = sh.Obj.extend({
    init: function(shaders) {
        var program = gl.createProgram();
        shaders.forEach(function(shader) {
            gl.attachShader(program,
                            resources.get('shaders/' + shader));
        });
        gl.linkProgram(program);
        gl.useProgram(program);

        var status = gl.getProgramParameter(program, gl.LINK_STATUS);
        if(!status) {
            var err = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error('program linking error: ' + err);
        }

        // Cache uniform locations
        this.program = program;
        this.worldTransformLoc = this.getUniformLocation("worldTransform");
        this.modelTransformLoc = this.getUniformLocation("modelTransform");
        this.normalLoc = this.getUniformLocation("normalMatrix");
    },

    getUniformLocation: function(uniform) {
        var loc = gl.getUniformLocation(this.program, uniform);
        if(loc === -1) {
            return null;
        }
        return loc;
    },

    getAttribLocation: function(attrib) {
        var loc = gl.getAttribLocation(this.program, attrib);
        if(loc === -1) {
            return null;
        }
        return loc;
    },

    use: function() {
        gl.useProgram(this.program);
    }
});