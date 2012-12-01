
sh.Collision = {
    boxLineHit: function(ent, lineStart, lineEnd) {
        var aabb = ent.AABB;
        var matInverse = mat4.create();

        mat4.identity(matInverse);
        mat4.translate(matInverse, aabb.getWorldPos());
        mat4.rotateZ(matInverse, ent.rot[2]);
        mat4.rotateY(matInverse, ent.rot[1]);
        mat4.rotateX(matInverse, ent.rot[0]);
        mat4.inverse(matInverse);

        var v1 = vec3.create();
        var v2 = vec3.create();
        mat4.multiplyVec3(matInverse, lineStart, v1);
        mat4.multiplyVec3(matInverse, lineEnd, v2);

        var extent = aabb.extent;
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
    },

    boxContainsPoint: function(aabb, point) {
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
    },

    frustumContainsPoint: function(mat, vec) {
        var clip = vec4.createFrom(vec[0], vec[1], vec[2], 1.0);
        mat4.multiplyVec4(mat, clip);

        return (Math.abs(clip[0]) < clip[3] &&
                Math.abs(clip[1]) < clip[3] &&
                0 < clip[2] &&
                clip[2] < clip[3]);
    },

    frustumContainsPointWhoTheEffCaresAboutTheYAxis: function(mat, vec) {
        var clip = vec4.createFrom(vec[0], vec[1], vec[2], 1.0);
        mat4.multiplyVec4(mat, clip);

        // Don't test the Y. We just want to clip X and Z
        return (Math.abs(clip[0]) < clip[3] &&
                0 < clip[2] &&
                clip[2] < clip[3]);
    },

    boxOverlaps: function(aabb1, aabb2) {
        var worldPos1 = aabb1.getWorldPos();
        var worldPos2 = aabb2.getWorldPos();

        var ab = vec3.create();
        vec3.subtract(worldPos2, worldPos1, ab);

        return (Math.abs(ab[0]) <= (aabb1.extent[0] + aabb2.extent[0]) &&
                Math.abs(ab[1]) <= (aabb1.extent[1] + aabb2.extent[1]) &&
                Math.abs(ab[2]) <= (aabb1.extent[2] + aabb2.extent[2]));
    },

    resolveBoxes: function(aabb1, aabb2) {
        var worldPos1 = aabb1.getWorldPos();
        var worldPos2 = aabb2.getWorldPos();

        var ab = vec3.create();
        vec3.subtract(worldPos2, worldPos1, ab);

        var f1 = aabb1.extent[0] + aabb2.extent[0] - Math.abs(ab[0]);
        var f2 = aabb1.extent[1] + aabb2.extent[1] - Math.abs(ab[1]);
        var f3 = aabb1.extent[2] + aabb2.extent[2] - Math.abs(ab[2]);

        if(f1 < f2 && f1 < f3) {
            if(ab[0] > 0) {
                return [-f1, 0, 0];
            }
            else {
                return [f1, 0, 0];
            }
        }
        else if(f2 < f1 && f2 < f3) {
            if(ab[1] > 0) {
                return [0, -f2, 0];
            }
            else {
                return [0, f2, 0];
            }
        }
        else if(f3 < f1 && f3 < f2) {
            if(ab[2] > 0) {
                return [0, 0, -f3];
            }
            else {
                return [0, 0, f3];
            }
        }

        return [0, 0, 0];
    },

    STATIC: 1,
    ACTIVE: 2,
    NONE: 3
};