**Table of Contents**  *generated with [DocToc](http://doctoc.herokuapp.com/)*

- [Introduction](#introduction)
- [Download and Install Node](#download-and-install-node)
- [Create package.json](#create-packagejson)
- [Install Modules](#install-modules)
- [Create Twitter App](#create-twitter-app)
- [Put Twitter variables into .env file](#put-twitter-variables-into-env-file)
- [Create main.js](#create-mainjs)
- [Drowning in Tweets](#drowning-in-tweets)
- [Storing data in redis](#storing-data-in-redis)
- [Replying to tweets](#replying-to-tweets)
- [Setting up Heroku](#setting-up-heroku)
	- [Installing and Creating App](#installing-and-creating-app)
	- [Configuring Heroku Add-Ons](#configuring-heroku-add-ons)
	- [Adding Heroku Environment Variables](#adding-heroku-environment-variables)
	- [Creating Procfile](#creating-procfile)
	- [Deploying to Heroku](#deploying-to-heroku)

## Introduction

So you want to make a twitter bot. Maybe you want to annoy your friends, aggregate some information for analysis, or use this as an introduction to Node.js, Heroku, or Redis. Whatever your reason, you've come to the right place.

Node.js is a platform for writing server side applications in javascript. These applications can be web servers that handle requests, serve webpages, and/or perform work. In our case, we just need it to do work. When it starts up it will connect to a Redis database, connect to the Twitter Streaming API, and post tweets using the Twitter REST Api.

Create a project folder, `$ git init`, and lets go!

## Setting up Node

### Download and Install Node

To get started, download and install [Node.js](http://nodejs.org/download/) and ensure that it is installed properly by running `$ node --version` from your console. This will allow you to run node applications and install node modules. The important commands will be explained along the way.

### Create `package.json`

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

### Install Modules

For this project, we will utilize the __[Twit](https://github.com/ttezel/twit)__ module to connect to Twitter streaming API and send tweets and we will use the __[redis](https://github.com/mranney/node_redis)__ module to store information in a Redis database. To install them, run the following commands:

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

Open up `.gitignore` and add the following line: 

`node_modules/*`

## Create Twitter App

Now go to the Twitter [developer portal](http://apps.twitter.com/) and click 'create a new app'. It is strongly advised that you do this with a NEW twitter account so you don't accidentally get your main account blocked. For the URL and Callback URL you can place a personal website, or just the URL for your twitter account.

After creating the app, go to the app details and select the __Permissions__ tab. You need to change the access level from *Read-only* to *Read and Write*. After saving that change, go to the __Keys and Access Tokens__ tab and click __Create my access token__.

Now you'll see an *Access Token* and *Access Token Secret* under __Your Access Token__, and up above under __Application Settings__ you'll see *Consumer Key (API Key)* and *Consumer Secret (API Secret)*. We'll need those four values in our project, but they must be kept secret. To do that, we'll use environment variables.

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

## Building the app

### Create `main.js`

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

var stream = T.stream('statuses/filter', { track: 'fun' });

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

### Drowning in Tweets

The command `node main.js` would run the code we just wrote, but would give an error that `config must provide consumer_key`. The node command only runs the code exactly as it is written. To make sure that the environment variables are available to our program we can use something called [Foreman](https://www.npmjs.com/package/foreman). Execute the following command:

`$ npm install -g foreman`

Foreman reads `.env` files and makes the variables avialable to node processes. Now you can run the app with the command:

`$ nf run node main.js`

If you kept the search term as __fun__ you should see a steady stream of values scrolling through the console.

### Storing data in redis

Make sure you have redis installed and running. Instructions for that can be found [here](http://redis.io/download). If you have problems getting redis to run locally, consider moving your development to a cloud development platform such as [Cloud9](https://c9.io).

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

### Replying to tweets

The following code will take a tweet object and a message and send a reply to the author of the provided tweet. Uncomment the call to this function in the processTweet function above to send greetings to users.

```
function replyTo(tweet, message) {
	var text = '@' + tweet.user.screen_name + ' ' + message;
	T.post('statuses/update', { status: text, in_reply_to_status_id: tweet.user.id_str }, 
	    function(err, data, response) {
		console.log(data)
	    }
	);
}
```

Go ahead and test that this works, possibly by changing your search term to something that nobody should be tweeting and then tweeting it. Make the search term your username or a random sequence of characters. When you know it runs locally, then you can move on to deploy it to the cloud.

## Setting up Heroku

### Installing and Creating App

Now you have everything you need to run a local twitter bot to monitor a search term and reply to users. Let's get it up into the cloud, though, so it will run forever without interruption.

If you don't have the heroku toolbelt installed, do that from [here](https://toolbelt.heroku.com/). Install it, create an account, and login from the console using the command `$ heroku login`.

You are now ready to create the heroku app with the command:

`$ heroku create [app-name]` where `[app-name]` should be replaced with a unique name of your choice. You can leave that part out and heroku will automatically assign your app a name.

### Configuring Heroku Add-Ons

The app is created, but the free [Redis Cloud add-on](https://addons.heroku.com/rediscloud) needs to be added. We'll also add the free [Papertrail logging add-on](https://addons.heroku.com/papertrail) to make it easy to view and search our heroku logs. Execute the following commands:

```
$ heroku addons:add rediscloud
$ heroku addons:add papertrail
```

### Adding Heroku Environment Variables

Since we are not uploading our `.env` file, we need to tell Heroku what our environment variables are. They can be added in the __settings__ tab of the application in the heroku dashboard, or by the command line using the command:

`$ heroku config:set VARIABLE_NAME=VALUE`

Add the five twitter variables to the heroku configuration. You'll remember that REDISCLOUD_URL is also an environment variable that our code references. We don't need to add that manually, though. It was automatically added to heroku when we added the add-on. You can view it and all of the environment variables with the command `$ heroku config`

### Creating Procfile

The last step before deploying is to set up a special file to tell Heroku how to run our application when new code is deployed. This is done with a `Procfile`. More information can be found [here](https://devcenter.heroku.com/articles/procfile), but basically `Procfile` lists types of processes that can be run by `foreman` on heroku servers. Ours should look like this:

`main: node main.js`

This defines a type of process called `main` that should be started with the command `node main.js` which will launch our app. Instead of `main`, we could have called it almost anything. That's because the name has no meaning except for one special type of process called `web` that is reserved in Heroku. It should be used to launch server processes. More information about that can be found in the procfile article linked above.

Earlier we started our app with the command `$ nf run node main.js`. Now we can use the following instead:

`$ nf start main`

Make sure this works before moving on.

### Deploying to Heroku

The twitter bot runs locally and we've configured heroku. Check your git status. It should contain exactly the following:

```
.gitignore
Procfile
main.js
package.json
```

If `node_modules` or `.env` are listed, add them to your `.gitignore` as instructed above and check again.

Now add and commit all of the files and push to heroku with the command:

`$ git push heroku master`

Your app is now on Heroku. It isn't running yet, though. Go to the heroku dashboard for your app and view the __resources__ tab. Under the __dynos__ section there should be an entry for __main__. Click __edit__ and change the number of 1X dynos from 0 to 1 and click save.

Then click __papertrail__ from the __addons__ section below to open the logs. You should see logs showing the app being scaled, starting, and finally having the state changed to 'up'. Below that a stream of tweets and logs should be coming through if everything is working.

Congratulations, you did it!
