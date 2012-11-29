
all: shade

shade: *.js
	cd static/js && \
	(echo "var sh = {};\nsh.util = {};" && \
	 cat shade/header.js \
		shade/util.js \
		shade/object.js \
		shade/program.js \
		shade/resources.js \
		shade/collision.js \
		shade/aabb.js \
		shade/quadtree.js \
		shade/scene.js \
		shade/scenenode.js \
		shade/mesh.js \
		shade/cube.js \
		shade/camera.js \
		shade/renderer.js \
		shade/mesh-loader.js && \
	 echo "if(typeof module !== 'undefined') { module.exports = sh; }") > node-shade.js
