var ab = require("./ab/");
var config = require("./config.js");
Appbase = {};
(function () {
  if(config.isWindow) { //do not expose auth in Node
    Appbase.authPopup = ab.interface.auth.auth;
    Appbase.authRedirect = ab.interface.auth.auth;
    Appbase.authCallback = ab.interface.auth.callback;
    Appbase.unauth = ab.interface.auth.unauth;
  }
  Appbase.credentials = function(appName, appSecret) {
    ab.server.setBaseURL('https://api.appbase.io/'+ appName +'/v2');
    ab.server.setAppSecret(appSecret); // TODO: Use server method to set secret
    config.isWindow && ab.auth.initOauthio(appName);
    ab.server.setApp(appName);
    return true
  }

  Appbase.serverTime = function(cb) {
    ab.server.timestamp(cb);
  }

  Appbase.ns = function(path) {
    return ab.interface.ns(path);
  }

  Appbase.uuid = ab.util.uuid;
}());

module.exports = Appbase;