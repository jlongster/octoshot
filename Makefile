
all: built

built: *.js
	rm -rf built
	mkdir built
	cat gl-matrix-min.js \
		simplex-noise.js \
		object.js \
		input.js \
		resources.js \
		scene.js \
		mesh.js \
		terrain.js \
		camera.js \
		shaders.js \
		renderer.js \
		mesh-loader.js \
		stats.min.js \
		main.js > built/bundled.js
	cp index-built.html built/index.html
	cp -r resources built
	java -jar compiler.jar --js built/bundled.js > built/bundled-out.js
	mv built/bundled-out.js built/bundled.js

clean:
	rm -rf built
