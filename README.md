# Introduction

So you want to make a twitter bot. Maybe you want to annoy your friends, aggregate some information for analysis, or use this as an introduction to Node.js, Heroku, or Redis. Whatever your reason, you've come to the right place.

Node.js is a platform for writing server side applications in javascript. These applications can be web servers that handle requests, serve webpages, and/or perform work. In our case, we just need it to do work. When it starts up it will connect to a Redis database, connect to the Twitter Streaming API, and post tweets using the Twitter REST Api.

So make a folder, `git init`, and lets go!

# Set-Up Node and your Project

## Download and Install Node

To get started, download and install [Node.js](http://nodejs.org/download/) and ensure that it is installed properly by running `$ node --version` from your console. This will allow you to run node applications and install node modules. The important commands will be explained along the way.

## Initialize `package.json`

The first file you need in a node application is the `package.json` file. You can create it through a wizard by running `$ npm init` in the root of your project, or you can copy this one: 

```
{
  "name": "tutorial",
  "version": "0.0.0",
  "description": "A twitter bot",
  "main": "main.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/yourname/projectname"
  },
  "author": "Your Name",
  "license": "MIT"
}
```
Many fields are self explanatory, but if you'd like more information you can look [here](http://browsenpm.org/package.json).

## Install Modules

For this project, we will utilize the [`Twit`](https://github.com/ttezel/twit) module to connect to Twitter streaming API and send tweets and we will use the [`redis`](https://github.com/mranney/node_redis) module to store information in a Redis database. To install them, run the following commands:

```
$ npm install twit --save
$ npm install redis --save
```

You should now see a `node_modules` folder in your directory, and `package.json` should now contain the following dependencies, though the version numbers may differ:
```
  "dependencies": {
    "twit": "^1.1.20",
    "redis": "^0.12.1"
  }
```

## Create Twitter App

Now go to the Twitter [developer portal](http://apps.twitter.com/) and click 'create a new app'. It is strongly advised that you do this with a NEW twitter account so you don't accidentally get your main account blocked. For the URL and Callback URL you can place a personal website, or just the URL for your twitter account.

After creating the app, go to the app details and select the _Permissions_ tab. You need to change the access level from *Read-only* to *Read and Write*. After saving that change, go to the _Keys and Access Tokens_ tab and click _Create my access token_.

Now you'll see an `Access Token` and `Access Token Secret` under _Your Access Token_, and up above under _Application Settings_ you'll see `Consumer Key (API Key)` and 'Consumer Secret (API Secret)'. We'll need those four values in our project, but they must be kept secret. To do that, we'll use environment variables.

## Put Twitter variables into `.env` file

Back in the root of your project, create a file called `.env`. This will be used to store our local configuration variables that we will access from our code. Paste the following stub into the `.env` file and fill in the values we obtained in the previous step. I've also added a DEBUG_USER environment variable. This should be the username for a twitter account that you want to have special privileges in our app. This could be your personal account, or the account that you will be tweeting from. 

```
TWITTER_CONSUMER_KEY=INSERT_KEY_HERE
TWITTER_CONSUMER_SECRET=INSERT_KEY_HERE
TWITTER_ACCESS_TOKEN=INSERT_KEY_HERE
TWITTER_ACCESS_SECRET=INSERT_KEY_HERE
DEBUG_USER=INSERT_USERNAME_HERE
```

Going through the trouble of hiding our secrets in `.env` doesn't do us any good if we publish the file to github. So open `.gitignore` and add the following line:

`*.env`

## Create `main.js`

Now let's start looking at tweets. Create a file called `main.js`.

The first thing we need to do is require the external modules that we'll be using. We can do that with the following lines:

```
var redis = require('redis');
var Twit = require('twit');
```

The require statements tell node to look through the modules directory for the modules and makes them available to us to use below. We'll get to Redis in a second, but first let's get twitter working. The following code goes after the require statements:

```
var T = new Twit({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_SECRET
});

var stream = T.stream('statuses/filter', { track: 'search term' });

stream.on('tweet', function (tweet) {
    console.log(tweet.text);
});

stream.on('limit', function (limitMessage) {
    console.log(limitMessage);
});

stream.on('disconnect', function (disconnectMessage) {
    console.log(disconnectMessage);
});

stream.on('reconnect', function (request, response, connectInterval) {
    console.log('Reconnecting in ' + connectInterval + 'ms...');
})

stream.on('error', function(error) {
    console.log(error);
});
```
It's very straightforward -- initialize a Twit object with the fields we need to access the API. From there, we use that Twit object to access the streaming API tracking a particular search term. This term could be '#ThanksObama' or any phrase that you want, but the more common it is, the more results you will get. We then have assign a function that gets called on each tweet that comes through the stream and we log the text of the tweet to the console.

The only tricky part is `process.env.TWITTER_CONSUMER_KEY` which accesses the environment variable that we put in `.env` with the name TWITTER_CONSUMER_KEY.

## Drowning in Tweets

The command `node main.js` would run the code we just wrote, but would give an error that `config must provide consumer_key`. The node command only runs the code exactly as it is written. To make sure that the environment variables are available to our program we can use something called `Foreman`. Execute the following command:

`$ npm install -g foreman`

Foreman reads `.env` files and makes the variables avialable to node processes. Now you can run the app with the command:

`$ nf run node main.js`

If you kept the search term as _fun_ you should see a steady stream of values scrolling through the console.

## Storing data in redis

Make sure you have redis installed and running. Instructions for that can be found [here](http://redis.io/download).

In `main.js` after initializing the Twit object (before the stream methods) add the following code:

```
var url = require('url');
var redisURL = url.parse(process.env.REDISCLOUD_URL || 'redis://127.0.0.1:6379');
var client = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
if (process.env.REDISCLOUD_URL) {
    client.auth(redisURL.auth.split(":")[1]);
}
```
We have a new require statement, this time for `url`. You may be wondering why we are requiring it without installing it. Node comes with a core API that can be required without installing, much like the Java standard library. You can get more information about that [here](http://nodejs.org/api/).

Also, this code has a new environment variable. If you have redis running locally, you can ignore `REDISCLOUD_URL` for now. It will be automatically added by Heroku when we need it later. This code merely connects to a redis instance.

Now, let's add a function called `processTweet` to handle the tweets coming in.

```
var REDIS_KEY = 'repliedTo';
function processTweet(tweet) {
    client.sadd(REDIS_KEY, tweet.user.id_str, function(err, reply) {
        if (err) {
            console.log(err);
        } else if (reply == 1 || tweet.user.screen_name == process.env.TWITTER_DEBUG_USER) {
            console.log('This is a new user OR it is the debug user');
            // replyTo(tweet, 'Good evening!');
        } else {
            console.log('We have seen this user before');
        }
    });
}
```

This function utilizes the redis command `sadd` to attempt to add the user_id to the database. `sadd` is short for "Set Add". Sets in redis are unordered lists of unique data associated with a key. Attempting to add a piece of data (like a users id) that already exists will return the value '0', while adding a piece that does not exist will return a value of '1'. That is what we leverage above to know if we have seen a tweet by a particular user before to make sure we don't tweet at them more than once and increase the risk of the bot getting banned. Right now we are only using that information to log data, but we have the information we need to reply to users. That's next.

Look [here](http://redis.io/commands) to learn more about redis commands and [here](http://redis.io/topics/data-types) to learn more about redis data types.

## Replying to tweets

The following code will take a tweet object and a message and send a reply to the author of the provided tweet. Uncomment the call to this function in the processTweet function above to send greetings to users.

'''
function replyTo(tweet, message) {
	var text = '@' + tweet.user.screen_name + ' ' + message;
	T.post('statuses/update', { status: text, in_reply_to_status_id: tweet.user.id_str }, function(err, data, response) {
		console.log(data)
	});
}
'''

## Deploying to Heroku

Now you have everything you need to run a local twitter bot to monitor a search term and reply to users. Let's get it up into the cloud, though, so it will run forever without interruption.

* `$ npm install [-g] [module] [--save]` -- The `npm install` command will allow you to install modules from [npm](https://www.npmjs.com/), or node package manager. There you will find modules to help with almost anything: making http requests, accessing twitter or API's, database plugins, etc. Some npm packages are meant to be used in your application. Node modules are automatically installed into the `node_modules` folder.

`$ npm install` will look in the current directory for a `package.json` file and install all modules listed as a dependency. For more information about the parts of `package.json` files, look [here](http://browsenpm.org/package.json).

`$ npm install twit --save` from your app directory would speak to npm and fetch the `twit` module for accessing the twitter API and store it in `node_modules`. This could then be referenced in your application files with a `require` statement which will be explained later. The `--save` argument will automatically add the module as a dependency in `package.json`

`$ npm install -g foreman` would fetch the `foreman` module and install it globally so that it can be used from the command line. This module will _not_ be in the `node_modules` folder.

Adding `--save` to the end of the command will add the dependency to your project and ensure that it 