# Webremix

## What it is

Converts your media urls and links to embedded HTML.

## Installation

    npm install webremix

## How to Use

    var remix = require('webremix');

    remix.generate('http://amazinggifs.com/cats.gif look at these amazing cats!', function(err, resp) {
        console.log(resp);
    });

Output becomes:

    <div class="image-wrapper">
        <a href="http://amazinggifs.com/cats.gif" target="_blank">
            <img src="http://amazinggifs.com/cats.gif">
        </a>
    </div> look at these amazing cats!

## Video size options

If you want to pass in a different width and height for Youtube/Vimeo/Rdio, pass in the following:

    var options = {
        width: 500,
        height: 200
    };

    remix.generate('https://www.youtube.com/watch?v=XYc6ZiV07ZE', options, function(err, resp) {
        console.log(resp);
    });

## Supported media

* Regular links (http://whatever.org or whatever.org)
* Links with image extensions of jpg|gif|png|jpeg
* Instagram urls
* Youtube urls
* Vimeo urls
* Soundcloud urls (will fall back to a regular link if the author has sharing disabled)
* Rdio urls
* Mixcloud urls

## Testing

    make test
