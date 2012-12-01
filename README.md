
![](http://jlongster.com:4000/img/octo-screen.png)

Octoshot is a multiplayer FPS for the web. You must defend your octocat-ness by
shooting others with lasers. Each person has 3 hit points, so you must
shoot well 3 times.

Octoshot features a 3d WebGL world, and a site for running games of up
to 8 players. Simply go to [the site](http://octoshot.jlongster.com/)
and click "start a game" to start a new game, or click "find a game"
and it will try to find an existing game and put you in it. When in a
game, you can simply pass the current URL around to other people and
they can join in!

The multiplayer server is authoritative, so it actually runs the game
on the serve and reconciles everything with all the players. No cheating available!

Whoever kills the most within 5 minutes wins the game!

![](http://jlongster.com/s/octoshot.png)

**This requires multiple people.** If nobody is playing, please ask a few people to jump on real quickly. Simply click "Start a Game" and you can give other people the URL that you are forward to.

Only tested in Firefox Nightly and Chrome (latest). The lastest release version of Firefox doesn't have the Pointer Lock API unfortunately, which is necessary for this game. Please either:

* Firefox Nightly (http://nightly.mozilla.org/)
* Google Chrome

#### Running

This is writting in node. If you want to run it locally, and you have a
recent version of node, you should be able to run it with simply `node
main` and access the site at `localhost:4000`.

#### Open Source Projects

The following libraries are used:

* [express.js](http://expressjs.com/) - Javascript web server
* [webremix](https://github.com/ednapiranha/node-webremix) - Inline media by replacing URLs with the actual content (images, videos, etc)
* [nunjucks](http://nunjucks.jlongster.com/) - Javascript templating engine
* [binaryjs](http://binaryjs.com/) - Binary websockets
* [gl-matrix](https://github.com/toji/gl-matrix) - High performance javascript vector and mat operations using Typed Arrays
