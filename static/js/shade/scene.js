
sh.Scene = sh.Obj.extend({
    init: function(sceneWidth, sceneDepth) {
        this.root = new sh.SceneNode();
        this.root.AABB = null;
        this.overlayRoot = new sh.SceneNode();

        this._objectsById = {};
        this._behaviors = [];
        this._entities = [];
        this.sceneWidth = sceneWidth;
        this.sceneDepth = sceneDepth;
        this.useQuadtree = true;

        this._quadtree = new sh.Quadtree(
            new sh.AABB(vec3.createFrom(sceneWidth / 2.0, 50, sceneDepth / 2.0),
                        vec3.createFrom(sceneWidth / 2.0, 50, sceneDepth / 2.0)),
            8
        );

        var _this = this;

        function addObj(obj) {
            if(obj.id) {
                _this._objectsById[obj.id] = obj;
            }

            if(obj.isEntity) {
                var idx = _this._entities.indexOf(obj);
                if(idx === -1) {
                    _this._entities.push(obj);
                }
            }

            _this._quadtree.add(obj);

            for(var i=0, l=obj.children.length; i<l; i++) {
                addObj(obj.children[i]);
            }
        }
        sh.SceneNode.onAdd(addObj);

        function removeObj(obj) {
            if(obj.id) {
                _this._objectsById[obj.id] = null;
            }

            if(obj.isEntity) {
                var idx = _this._entities.indexOf(obj);
                if(idx !== -1) {
                    _this._entities.splice(idx, 1);
                }
            }

            _this._quadtree.remove(obj);

            for(var i=0, l=obj.children.length; i<l; i++) {
                removeObj(obj.children[i]);
            }
        }
        sh.SceneNode.onRemove(removeObj);
    },

    addObject: function(obj) {
        this.root.addObject(obj);
    },

    add2dObject: function(obj) {
        this.overlayRoot.addObject(obj);
    },

    getCamera: function() {
        return this.camera;
    },

    setCamera: function(camera) {
        this.camera = camera;
    },

    getOverlay: function() {
        return this.overlayRoot;
    },

    addBehavior: function(obj) {
        this._behaviors.push(obj);
    },

    getObject: function(id) {
        return this._objectsById[id];
    },

    findNearbyObjects: function(aabb, func) {
        this._quadtree.findObjects(aabb, func);
    },

    traverse: function(func) {
        this.root.traverse(func);
    },

    checkCollisions: function(node) {
        node = node || this.root;

        if(node.collisionType === sh.Collision.ACTIVE) {
            this.checkObjCollisions(node);
        }

        var children = node.children;
        for(var i=0, l=children.length; i<l; i++) {
            this.checkCollisions(children[i]);
        }
    },

    checkObjCollisions: function(obj) {
        if(obj.AABB) {
            this.findNearbyObjects(
                obj.AABB,
                function(obj2) {
                    if(obj != obj2 &&
                       obj2.collisionType != sh.Collision.NONE &&
                       sh.Collision.boxOverlaps(obj.AABB, obj2.AABB)) {
                        var b = sh.Collision.resolveBoxes(obj.AABB, obj2.AABB);
                        obj.translate(b[0], b[1], b[2]);
                    }
                }
            );
        }
    },

    fillQueue: function(arr, cameraPoint, frustum) {
        if(this.useQuadtree) {
            var sky = this.getObject('sky');
            if(sky) {
                arr.push(sky);
            }

            this._quadtree.findObjectsInFrustum(frustum, cameraPoint, function(obj) {
                if(arr.indexOf(obj) === -1) {
                    arr.push(obj);
                }
            });

            var ents = this._entities;
            for(var i=0; i<ents.length; i++) {
                // Just go ahead and render all the entities, damnit
                ents[i].traverse(function(obj) {
                    arr.push(obj);
                });
            }
        }
        else {
            this.root.traverse(function(obj) {
                arr.push(obj);
            });
        }
    },

    update: function(dt) {
        this.updateObject(this.root, dt);
        this.updateObject(this.overlayRoot, dt);

        for(var i=0, l=this._behaviors.length; i<l; i++) {
            this._behaviors[i].update(dt);
        }

        this.checkCollisions();
        this.camera.updateMatrices();
    },

    updateObject: function(obj, dt, force) {
        obj.update(dt);

        var dirty = obj.needsWorldUpdate();
        obj.updateMatrices(force);

        var children = obj.children;
        for(var i=0, l=children.length; i<l; i++) {
            this.updateObject(children[i], dt, dirty || force);
        }
    }
});