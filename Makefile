
all: main.js

main.js: main.ljs
	./LLJS/bin/ljc -o main.js main.ljs

clean:
	rm main.js
