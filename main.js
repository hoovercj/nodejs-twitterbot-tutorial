var redis = require('redis');
var Twit = require('twit');
var T = new Twit({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_SECRET
});

var REDIS_KEY = 'repliedTo';
function processTweet(tweet) {
    client.sadd(REDIS_KEY, tweet.user.id_str, function(err, reply) {
        if (err) {
            console.log(err);
        } else if (reply == 1 || tweet.user.screen_name == process.env.TWITTER_DEBUG_USER) {
            console.log('This is a new user OR it is the debug user');
        } else {
            console.log('We have seen this user before');
        }
    });
}

var stream = T.stream('statuses/filter', { track: 'Thanks Obama' });

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