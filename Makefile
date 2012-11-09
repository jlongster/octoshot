
all: main.js

main.js: main.ljs
	./LLJS/bin/ljc -o main.js main.ljs

built:

clean:
	rm main.js
