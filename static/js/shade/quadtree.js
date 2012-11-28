
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
            if(boxOverlaps(this.AABB, entity.AABB)) {
                this._add(entity);
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