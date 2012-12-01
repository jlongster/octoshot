
Octoshot is a multiplayer FPS for the web. You must defend your octocat-ness by
shooting others with lasers. Each person has 3 hit points, so you must
shoot well 3 times.

Octoshot features a 3d WebGL world, and a site for running games of up
to 8 players. Simply go to [the site](http://octoshot.jlongster.com/) and
click "start a game" to start a new game, or click "find a game" and
it will try to find an existing game and put you in it.

The multiplayer server is authoritative, so it actually runs the game
on the serve and reconciles everything with all the players. No cheating available!

![](http://jlongster.com:4000/img/octo-screen.png)

Whoever kills the most within 5 minutes wins the game!

This is writting in node. If you want to run it locally, and you have a
recent version of node, you should be able to run it with simply `node
main` and access the site at `localhost:4000`.