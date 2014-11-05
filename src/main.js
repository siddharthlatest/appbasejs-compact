var config = require("./config.js");
var ab = require("./ab/");

var Appbase = {};
if(config.isWindow) { //do not expose auth in Node
  Appbase.authPopup = ab.interface.auth.authPopup;
  Appbase.authRedirect = ab.interface.auth.authRedirect;
  Appbase.authCallback = ab.interface.auth.callback;
  Appbase.unauth = ab.interface.auth.unauth;
}
Appbase.credentials = function() {
  var validArgs = ab.inputHandling.doIt(arguments, [{name: 'appName', type: 'app'}, {name: 'appSecret', type: 'secret', optional: true}, {name: 'callback', type: 'function', optional: true}]);
  if(validArgs.error) throw validArgs.error;
  
  ab.server.setBaseURL(config.appbaseApiServer + '/'+ validArgs.appName +'/v' + config.version);
  ab.server.setAppSecret(validArgs.appSecret); // TODO: Use server method to set secret
  config.isWindow && ab.auth.initOauthio(validArgs.appName);
  ab.server.setApp(validArgs.appName);
  var randomRef = Appbase.ns(Appbase.uuid()).v(Appbase.uuid());
  validArgs.callback !== undefined && ab.interface.isValid(randomRef.URL(), function(er, isValid) {
    var error = (er !== null && (er !== '021: Invalid secret key' && er !== '022: Invalid secret key')) ? er : null // Invalid secret key is not a n error in this case
    error = error ? error : (isValid? 'Unexpected result from server while checking for credentials.' : null) // isValid should ALWAYS be false, for UUID vertex
    error? validArgs.callback(error) : validArgs.callback(null, (er !== '021: Invalid secret key' && er !== '022: Invalid secret key'))
  });
}
Appbase.serverTime = function() {
  var validArgs = ab.inputHandling.doIt(arguments, [{name: 'callback', type: 'function'}]);
  if(validArgs.error) throw validArgs.error;
  
  ab.server.timestamp(validArgs.callback);
}
Appbase.ns = function() {
  var validArgs = ab.inputHandling.doIt(arguments, [{name: 'namespace', type: 'ns'}]);
  if(validArgs.error) throw validArgs.error;
  
  return ab.interface.ns(validArgs.namespace);
}
Appbase.uuid = ab.util.uuid;

module.exports = Appbase;