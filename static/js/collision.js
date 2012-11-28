
(function(vec3, mat4) {

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

    function boxContainsPoint(aabb, point) {
        var worldPos = aabb.getWorldPos();

        var upper = vec3.create();
        vec3.add(worldPos, aabb.extent, upper);

        var lower = vec3.create();
        vec3.subtract(worldPos, aabb.extent, lower);

        if(upper[0] >= point[0] &&
           lower[0] <= point[0] &&
           upper[1] >= point[1] &&
           lower[1] <= point[1] &&
           upper[2] >= point[2] &&
           lower[2] <= point[2]) {
            return true;
        }

        return false;
    }

    function boxOverlaps(aabb1, aabb2) {
        var worldPos1 = aabb1.getWorldPos();
        var worldPos2 = aabb2.getWorldPos();

        var ab = vec3.create();
        vec3.subtract(worldPos2, worldPos1, ab);

        return (Math.abs(ab[0]) <= (aabb1.extent[0] + aabb2.extent[0]) &&
                Math.abs(ab[1]) <= (aabb1.extent[1] + aabb2.extent[1]) &&
                Math.abs(ab[2]) <= (aabb1.extent[2] + aabb2.extent[2]));
    }

    if(typeof module !== 'undefined') {
        module.exports = {
            boxLineHit: boxLineHit,
            boxContainsPoint: boxContainsPoint,
            boxOverlaps: boxOverlaps
        };
    }
    else {
        window.boxLineHit = boxLineHit;
        window.boxContainsPoint = boxContainsPoint;
        window.boxOverlaps = boxOverlaps;
    }


}).apply(this, (typeof module !== 'undefined' ?
                [require('./shade/gl-matrix').vec3,
                 require('./shade/gl-matrix').mat4] :
                [vec3, mat4]));