'use strict';

var oauth = require('oauth');
var AWS = require('aws-sdk');

var credentials = require('credentials-secret');

// ensure AWS is requesting the nearest region
AWS.config.update({
    region: 'eu-west-1'
});

// predefine variables that will not change after creation
// to minimize unnecessary load time
var api = new oauth.OAuth(
  'https://twitter.com/oauth/request_token',
  'https://twitter.com/oauth/access_token',
  twitterConsumerKey,
  twitterConsumerSecret,
  '1.0A',
  '',
  'HMAC-SHA1'
)

// the function that will be executed by Lambda
exports.handler = function (event, context) {
  // only ment for debugging
  // console.log('event:', event)
  // console.log('context:', context)
  // console.log('params:', params)

  // event will exists of
  /**
  * event.oauth_token = used to be able to request an access token
  * event.oauth_verifier = used to be able to request an access token
  * event.token = token to identify current user
  */

  // retrieve secret value connected to the session-token
  var db = new DBConnector() // this can be DynamoDB, Firebase, etc..
  var params = {
    table: 'feed-users',
    id: event.oauth_token,
    token: event.token // used to identify that callback is not for another user while it is asynchronous
  }
  db.get(params, function (err, data) {
    if (err) {
      console.error('Unable to query. Error:', JSON.stringify(err, null, 2))
      context.fail(err)
    } else {
      // all necessary tokens found, so request for "permanent" access token
      api.getOAuthAccessToken(event.oauth_token, data.secret, event.oauth_verifier, function (error, oauthToken, oauthTokenSecret, results) {
        if (error) {
          console.log('Access token fail:', error)
          context.fail(error)
        } else {
          // store in DB
          var updateParams = {
            table: 'feed-users',
            item: {
              id: event.oauth_token,
              verifier: event.oauth_verifier,
              authToken: oauthToken,
              authSecret: oauthTokenSecret,
              handle: results.user_id, // for example 21984712984712 at Twitter
              handle_name: results.screen_name // for example @sayyupnl at Twitter
            }
          }
          db.put(updateParams, function (err2, data) {
            if (err2) {
              console.error('Unable to add item. Error JSON:', JSON.stringify(err2, null, 2))
              context.fail(err2)
            } else {
              context.succeed({done:true})
            }
          })
        }
      })
    }
  })
}

