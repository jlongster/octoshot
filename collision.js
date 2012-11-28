
var glMatrix = require('./static/js/shade/gl-matrix');
var vec3 = glMatrix.vec3;
var mat4 = glMatrix.mat4;

function boxLineHit(ent, lineStart, lineEnd) {
    var matInverse = mat4.create();
    mat4.identity(matInverse);
    mat4.translate(matInverse, ent.pos);
    mat4.rotateZ(matInverse, ent.rot[2]);
    mat4.rotateY(matInverse, ent.rot[1]);
    mat4.rotateX(matInverse, ent.rot[0]);
    mat4.inverse(matInverse);

    var v1 = vec3.create();
    var v2 = vec3.create();
    mat4.multiplyVec3(matInverse, lineStart, v1);
    mat4.multiplyVec3(matInverse, lineEnd, v2);

    var extent = vec3.createFrom(ent.scale[0] / 2.0,
                                 ent.scale[1] / 2.0,
                                 ent.scale[2] / 2.0);
    vec3.subtract(v1, extent);
    vec3.subtract(v2, extent);

    var lMid = vec3.create();
    vec3.add(v1, v2, lMid);
    vec3.scale(lMid, 0.5);

    var l = vec3.create();
    vec3.subtract(v1, lMid, l);

    var lExt = vec3.createFrom(Math.abs(l[0]),
                               Math.abs(l[1]),
                               Math.abs(l[2]));

    if(Math.abs(lMid[0]) > extent[0] + lExt[0]) {
        return false;
    }
    else if(Math.abs(lMid[1]) > extent[1] + lExt[1]) {
        return false;
    }
    else if(Math.abs(lMid[2]) > extent[2] + lExt[2]) {
        return false;
    }
        
    vec3.cross(lMid, l);

    var r = extent[1] * lExt[2] + extent[2] * lExt[1];
    if(Math.abs(lMid[0]) > r) {
        return false;
    }
    
    r = extent[0] * lExt[2] + extent[2] * lExt[0];
    if(Math.abs(lMid[1]) > r) {
        return false;
    }

    r = extent[0] * lExt[1] + extent[1] * lExt[0];
    if(Math.abs(lMid[2]) > r) {
        return false;
    }

    // WHY WON'T THIS WORK?? T_T
    // EDIT: IT FINALLY WORKSSSSSSS!
    return true;
}

module.exports = {
    boxLineHit: boxLineHit
};