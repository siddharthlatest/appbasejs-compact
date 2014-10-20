var ab = require("./index.js");
var OAuth = require("./oauthio.js");
var atomic = require("./../atomic.js");
ab.auth = {
  config: {
    oauthdURL: 'https://auth.appbase.io/',
    oauthMiddleSever: 'https://auth.appbase.io:444',
    oauthTokenURL: '/oauth/signin',
    oauthRefreshURL: '/oauth/refresh',
  },
  initOauthio: function (app) {
    OAuth.initialize(app);
    OAuth.setOAuthdURL(ab.auth.config.oauthdURL);
  },
  codeToCreds: function(provider, code, cb) {
    var data = {
      app: ab.server.getApp(),
      code: code,
      provider: provider
    };
    atomic.post(ab.auth.config.oauthMiddleSever + ab.auth.config.oauthTokenURL, data)
      .success(cb.bind(null, null))
      .error(cb)
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
  }
}

module.exports = ab.auth;