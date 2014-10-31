var config = require("./config.js");
var ab = require("./ab/");

var Appbase = {};
if(config.isWindow) { //do not expose auth in Node
  Appbase.authPopup = ab.interface.auth.auth;
  Appbase.authRedirect = ab.interface.auth.auth;
  Appbase.authCallback = ab.interface.auth.callback;
  Appbase.unauth = ab.interface.auth.unauth;
}
Appbase.credentials = function(appName, appSecret, callback) {
  ab.server.setBaseURL(config.appbaseApiServer + '/'+ appName +'/v2');
  ab.server.setAppSecret(appSecret); // TODO: Use server method to set secret
  config.isWindow && ab.auth.initOauthio(appName);
  ab.server.setApp(appName);
  var randomRef = Appbase.ns(Appbase.uuid()).v(Appbase.uuid());
  callback && ab.interface.isValid(randomRef.URL(), function(er, isValid) {
    var error = (er !== null && (er !== '021: Invalid secret key' && er !== '022: Invalid secret key')) ? er : null // Invalid secret key is not a n error in this case
    error = error ? error : (isValid? 'Unexpected result from server while checking for credentials.' : null) // isValid should ALWAYS be false, for UUID vertex
    error? callback(error) : callback(null, (er !== '021: Invalid secret key' && er !== '022: Invalid secret key'))
  });
}
Appbase.serverTime = function(cb) {
  ab.server.timestamp(cb);
}
Appbase.ns = function(path) {
  return ab.interface.ns(path);
}
Appbase.uuid = ab.util.uuid;

module.exports = Appbase;