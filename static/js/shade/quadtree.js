
sh.Quadtree = sh.Obj.extend({
    init: function(aabb, capacity, depth) {
        this.AABB = aabb;
        this.capacity = capacity;
        this.objects = [];
        this.children = null;
        this.depth = depth || 0;
    },

    add: function(entity) {
        if(entity.AABB) {
            if(sh.Collision.boxOverlaps(this.AABB, entity.AABB)) {
                this._add(entity);
            }
        }
    },

    remove: function(entity) {
        if(this.children) {
            var children = this.children;
            for(var i=0, l=children.length; i<l; i++) {
                children[i].remove(entity);
            }
        }
        else {
            var idx = this.objects.indexOf(entity);
            if(idx !== -1) {
                this.objects.splice(idx, 1);
            }
        }
    },

    findObjects: function(aabb, func) {
        if(sh.Collision.boxOverlaps(this.AABB, aabb)) {
            if(this.children) {
                var children = this.children;
                for(var i=0, l=children.length; i<l; i++) {
                    children[i].findObjects(aabb, func);
                }
            }
            else {
                var obj = this.objects;
                for(var i=0, l=obj.length; i<l; i++) {
                    func(obj[i]);
                }
            }
        }
    },

    findObjectsInFrustum: function(frustum, cameraPoint, func) {
        // Forcefully render the first two levels
        if(this.depth < 2) {
            this._findObjectsInFrustum(frustum, cameraPoint, func);
        }

        var v = vec3.create();
        var aabb = this.AABB;
        var pos = aabb.getWorldPos();
        var extent = vec3.create();
        vec3.set(aabb.extent, extent);

        var inside = sh.Collision.frustumContainsPointWhoTheEffCaresAboutTheYAxis;

        vec3.add(pos, extent, v);
        if(inside(frustum, v)) {
            this._findObjectsInFrustum(frustum, cameraPoint, func);
            return;
        }

        extent[0] = -extent[0];
        vec3.add(pos, extent, v);
        if(inside(frustum, v)) {
            this._findObjectsInFrustum(frustum, cameraPoint, func);
            return;
        }

        extent[2] = -extent[2];
        vec3.add(pos, extent, v);
        if(inside(frustum, v)) {
            this._findObjectsInFrustum(frustum, cameraPoint, func);
            return;
        }

        extent[0] = -extent[0];
        vec3.add(pos, extent, v);
        if(inside(frustum, v)) {
            this._findObjectsInFrustum(frustum, cameraPoint, func);
            return;
        }

        extent[1] = -extent[1];
        extent[2] = -extent[2];

        vec3.add(pos, extent, v);
        if(inside(frustum, v)) {
            this._findObjectsInFrustum(frustum, cameraPoint, func);
            return;
        }

        extent[0] = -extent[0];
        vec3.add(pos, extent, v);
        if(inside(frustum, v)) {
            this._findObjectsInFrustum(frustum, cameraPoint, func);
            return;
        }

        extent[2] = -extent[2];
        vec3.add(pos, extent, v);
        if(inside(frustum, v)) {
            this._findObjectsInFrustum(frustum, cameraPoint, func);
            return;
        }

        extent[0] = -extent[0];
        vec3.add(pos, extent, v);
        if(inside(frustum, v)) {
            this._findObjectsInFrustum(frustum, cameraPoint, func);
            return;
        }

        // Always render the box that the player is standing in
        if(sh.Collision.boxContainsPoint(this.AABB, cameraPoint)) {
            this._findObjectsInFrustum(frustum, cameraPoint, func);
        }
    },

    _findObjectsInFrustum: function(frustum, cameraPoint, func) {
        if(this.children) {
            var children = this.children;
            for(var i=0, l=children.length; i<l; i++) {
                children[i].findObjectsInFrustum(frustum, cameraPoint, func);
            }
        }
        else {
            var objs = this.objects;
            for(var i=0, l=objs.length; i<l; i++) {
                func(objs[i]);
            }
        }
    },

    _add: function(entity) {
        if(this.children) {
            for(var i=0; i<this.children.length; i++) {
                this.children[i].add(entity);
            }
        }
        else {
            if(this.objects.length > this.capacity && this.depth < 5) {
                this.subdivide();
                this._add(entity);
            }
            else {
                this.objects.push(entity);
            }
        }
    },

    subdivide: function() {
        var aabb = this.AABB;
        var extent = vec3.create();
        vec3.set(aabb.extent, extent);
        extent[0] *= .5;
        extent[2] *= .5;

        this.children = [];

        // Yackity yuck yuck
        var pos = vec3.create(aabb.pos);
        pos[0] -= extent[0];
        pos[2] -= extent[2];
        this.children.push(new sh.Quadtree(
            new sh.AABB(pos, extent),
            this.capacity,
            this.depth + 1
        ));

        pos = vec3.create(aabb.pos);
        pos[0] += extent[0];
        pos[2] -= extent[2];
        this.children.push(new sh.Quadtree(
            new sh.AABB(pos, extent),
            this.capacity,
            this.depth + 1
        ));

        pos = vec3.create(aabb.pos);
        pos[0] -= extent[0];
        pos[2] += extent[2];
        this.children.push(new sh.Quadtree(
            new sh.AABB(pos, extent),
            this.capacity,
            this.depth + 1
        ));

        pos = vec3.create(aabb.pos);
        pos[0] += extent[0];
        pos[2] += extent[2];
        this.children.push(new sh.Quadtree(
            new sh.AABB(pos, extent),
            this.capacity,
            this.depth + 1
        ));

        for(var i=0; i<this.objects.length; i++) {
            this._add(this.objects[i]);
        }

        this.objects = [];
    },

    render: function(program) {
        this.AABB.render(program);

        if(this.children) {
            for(var i=0; i<this.children.length; i++) {
                this.children[i].render(program);
            }
        }
    }
});