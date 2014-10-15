var ab = require("./ab/");
var Appbase = {};
var isNode =(typeof window === 'undefined');
(function () {
  if(!isNode) { //do not expose auth in Node
    Appbase.authPopup = ab.interface.auth.auth;
    Appbase.authRedirect = ab.interface.auth.auth;
    Appbase.authCallback = ab.interface.auth.callback;
    Appbase.unauth = ab.interface.auth.unauth;
  }
  Appbase.credentials = function(appName, appSecret) {
    ab.server.setBaseURL('http://'+ appName + '.' + 'api2.appbase.io');
    ab.server.setAppSecret(appSecret); // TODO: Use server method to set secret
    !isNode && ab.auth.initOauthio(appName);
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