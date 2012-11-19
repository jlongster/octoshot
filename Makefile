
all: built

built: *.js
	rm -rf built
	mkdir built
	cat shade/gl-matrix.js \
		shade/util.js \
		shade/object.js \
		shade/resources.js \
		shade/scene.js \
		shade/mesh.js \
		shade/camera.js \
		shade/cube.js \
		shade/shaders.js \
		shade/renderer.js \
		shade/mesh-loader.js \
		input.js \
		simplex-noise.js \
		terrain.js \
		stats.min.js \
		sample2.js > built/bundled2.js
	cp index-built.html built/index.html
	cp -r resources built
	java -jar compiler.jar --js built/bundled.js > built/bundled-out.js
	mv built/bundled-out.js built/bundled.js

clean:
	rm -rf built
