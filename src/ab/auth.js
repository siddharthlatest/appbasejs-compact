var ab = require("./index.js");
var OAuth = require("./oauthio.js");
var atomic = require("./../atomic.js");
ab.auth = {
  config: {
    oauthdURL: 'https://auth.appbase.io/',
    oauthMiddleSever: 'https://auth.appbase.io:3000',
    oauthTokenURL: '/oauth/signin',
    oauthRefreshURL: '/oauth/refresh',
  },
  initOauthio: function (app) {
    OAuth.initialize(app);
    OAuth.setOAuthdURL(ab.auth.config.oauthdURL);
  },
  completeAuth: function(provider, cb) {
    return function(error, providerResponse) {
      if(error) {
        ab.auth.unauth();
        cb(error)
        return
      }
      var savedCreds = ab.auth.restoreCreds()
      //TODO: check for code, provider
      if(savedCreds && (Date.now()/1000 < ((savedCreds.credentials.appbase.expires_in) + savedCreds.credentials.appbase.generated_at))) {
        ab.server.setAppbaseToken(savedCreds.credentials.appbase.access_token)
        cb(null, savedCreds, ab.auth.credsToRequetObj(savedCreds))
      } else {
        ab.auth.saveCreds(null)
        ab.auth.codeToCreds(provider, providerResponse.code, function(error, creds) {
          creds.credentials.appbase.generated_at = (Date.now()/1000) - 2 //assuming network latency 2 secs
          creds.credentials.provider.generated_at = creds.credentials.appbase.generated_at
          ab.auth.saveCreds(creds)
          ab.server.setAppbaseToken(creds.credentials.appbase.access_token)
          cb(null, creds, ab.auth.credsToRequetObj(creds))
        })
      }
    }
  },
  codeToCreds: function(provider, code, cb) {
    var data = {
      app: ab.server.getApp(),
      code: code,
      provider: provider
    };
    atomic.post(ab.auth.config.oauthMiddleSever + ab.auth.config.oauthTokenURL, data)
      .success(cb.bind(null, null))
      .error(function(error) {
        ab.auth.unauth();
        cb(error);
      })
  },
  credsToRequetObj: function(creds) {
    return OAuth.create(creds.credentials.provider.provider, creds.credentials.provider);
  },
  saveCreds: function(creds) {
    localStorage.setItem('appbase_credentials', JSON.stringify(creds));
  },
  restoreCreds: function() {
    try {
      return JSON.parse(localStorage.getItem('appbase_credentials'));
    } catch(e) {
      return null;
    }
  },
  unauth: function() {
    ab.auth.saveCreds(null);
    ab.server.setAppbaseToken(null);
    var delete_cookie = function( name ) {
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/';
    }
    delete_cookie("oauthio_provider_google");
    delete_cookie("oauthio_provider_linkedin");
    delete_cookie("oauthio_provider_facebook");
    delete_cookie("oauthio_provider_dropbox");
    delete_cookie("oauthio_provider_github");
  }
}

module.exports = ab.auth;