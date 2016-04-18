// define libraries you would need
var oauth = require('oauth')
var AWS = require('aws-sdk')
var cuid = require('cuid')

// define your OAuth-application credentials
var twitterConsumerKey = 'xxxxxxxxxxxxxxxxxxxx'
var twitterConsumerSecret = 'xxxxxxxxxxxxxxxxxxxx'

// ensure AWS is requesting the nearest region
AWS.config.update({
  region: 'eu-west-1'
})

// the function that will be executed by Lambda
exports.handler = function (event, context) {
  // define unique token to identify callback data for which user it is ment
  var idToken = cuid()

  // define OAuth signature
  var api = new oauth.OAuth(
    'https://twitter.com/oauth/request_token',
    'https://twitter.com/oauth/access_token',
    twitterConsumerKey,
    twitterConsumerSecret,
    '1.0A',
    'https://api.yourdomain.com/connect/callback?token=' + idToken,
    'HMAC-SHA1'
  )

  // get request token and redirect users to that URL
  api.getOAuthRequestToken(function (error, oauthToken, oauthTokenSecret, result) {
    if (error) {
      context.fail(error)
    } else {
      // store tokens to be able to map the data correctly
      var db = new DBConnector() // this can be DynamoDB, Firebase, etc..
      var params = {
        table: 'feed-users',
        item: {
          id: oauthToken,
          secret: oauthTokenSecret,
          idToken: idToken
        }
      }

      // save tokens to use with the callback
      db.put(params, function (err, data) {
        if (err) {
          console.error('Unable to add item. Error JSON:', JSON.stringify(err, null, 2))
          context.fail(err)
        } else {
          console.log('Added item:', JSON.stringify(data, null, 2), token)
          // redirect user to correct URL to acknowledge the new share settings
          context.succeed({
            location: 'https://twitter.com/oauth/authorize?oauth_token=' + oauthToken
          })
        }
      })
    }
  })
}
