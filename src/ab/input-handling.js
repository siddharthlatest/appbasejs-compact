// Helps handling and validating arguments passed to interface methods
var ab = require("./index.js");
ab.inputHandling = {};

//checks for the type of the arguments. Returns undefined if no error, otherwise returns the string which represents the desired input
var isInputErrornous = function(input, desired) {
  switch(desired) {
    case "alphaNumUnder": 
      var pattern = new RegExp("^[a-zA-Z0-9_]*$");
      if(!(typeof input === "string" && input !== "" && pattern.test(input))) {
        return "an alphanumeric string with underscores";
      }
      break;
      
    case "charSupport":
      var pattern = new RegExp("^([\x00-\xFF])*$"); // all ascii
      var antiPattern = new RegExp("^([^,/?:@&=+$#~])+$");
      if(!(typeof input === "string" && input !== "" && pattern.test(input) &&  antiPattern.test(input))) {
        return "an ascii string except ',', '/', '?', ':', '@', '&', '=', '+', '$', '#', and '~' characters";
      }
      break;
      
    case "nsRef":
      if(!(typeof input === "object" && input.isNS)) {
        return "an appbase namespace reference";
      }
      break;
    case "vRef":
      if(!(typeof input === "object" && input.isV)) {
        return "an appbase vertex reference";
      }
      break;
    
    case "vPath":
      input = ab.util.cutLeadingTrailingSlashes(input);
      var pattern = new RegExp("^([\x00-\xFF])*$"); // all ascii
      var antiPattern = new RegExp("^([^,?:@&=+$#~])+$");
      if(!(typeof input === "string" && input !== "" && pattern.test(input))) {
        return "an ascii string except ',', '?', ':', '@', '&', '=', '+', '$', '#', and '~' characters";
      }
      break;
    
    case "vKey":
      input = ab.util.cutLeadingTrailingSlashes(input);
      var e = isInputErrornous(input, 'charSupport');
      if(e) return 'a vertex key - ' + e;
      break;
      
    case "pName":
      if(!(typeof input === "string" && input !== "")) {
        'a property name - a unicode string';
      }
      break;
      
    case "pNameOrArray": 
      var msg = '; or an array of property names';
      var error;
      if(input instanceof Array) {
        input.forEach(function(pName) {
          error = error || isInputErrornous(pName, 'pName');
        });
      } else {
        error = isInputErrornous(input, 'pName');
      }
      if(error) return error + msg;
      break;
      
    case "eName":
      var e = isInputErrornous(input, 'charSupport');
      if(e) return 'an edge name - ' + e;
      break;
      
    case "eNameOrArray": 
      var msg = '; or an array of edge names';
      var error;
      if(input instanceof Array) {
        input.forEach(function(eName) {
          error = error || isInputErrornous(eName, 'eName');
        });
      } else {
        error = isInputErrornous(input, 'eName');
      }
      if(error) return error + msg;
      break;
      
    case "ns":
      var e = isInputErrornous(input, 'charSupport');
      if(e) return 'a namespace identifier - ' + e;
      break;
      
    case "vEvent":
      if(!(typeof input === "string" && input !== "" && (input === "edge_added" || input === "edge_removed" || input === "edge_changed" || input === "properties"))) {
        return "a vertex event - 'properties', 'edge_added', 'edge_removed' or 'edge_changed'";
      }
      break;
      
    case "vEventProperties":
      if(!(typeof input === "string" && input !== "" && (input === "properties"))) {
        return "vertex 'properties' event";
      }
      break;

    case "nsEvent":
      if(!(typeof input === "string" && input !== "" && (input === "vertex_added" || input === "vertex_removed"))) {
        return "a namespace event - 'vertex_added' or 'vertex_removed'";
      }
      break;
      
    case "eFilters":
      if(typeof input === "object") {
        if(!(typeof input.startAt === 'number' || typeof input.startAt === 'undefined'))
          return "edge filters - an object with 'startAt' as a number";
        if(!(typeof input.endAt === 'number' || typeof input.endAt === 'undefined'))
          return "edge filters - an object with 'endAt' as a number";
        if(!(typeof input.limit === 'number' || typeof input.limit === 'undefined'))
          return "edge filters - an object with 'limit' as a number";
        if(!(typeof input.skip === 'number' || typeof input.skip === 'undefined'))
          return "edge filters - an object with 'skip' as a number";
        if(!(typeof input.onlyNew === 'boolean' || typeof input.onlyNew === 'undefined'))
          return "edge filters - an object with 'onlyNew' as a boolean";
      } else {
        return "edge filters - an object";
      }
      break;
      
    case "provider":
      if(!(input === "google" || input === "linkedin" || input === "facebook" || input === "github" || input === "dropbox")) {
        return "a provider name"
      }
      break;
      
    case "app":
      var pattern = new RegExp("^[a-z0-9_]*$");
      if(!(typeof input === "string" && input !== "" && pattern.test(input))) {
        return "application name - a lower case alphanumeric string with underscores";
      }
      break;
      
    case "secret":
      var pattern = new RegExp("^[a-zA-Z0-9]*$");
      if(!(typeof input === "string" && input !== "" && pattern.test(input))) {
        return "application secret - an alphanumeric string";
      }
      break;

    default: 
      if(!(typeof input === desired)) {
        return 'a ' + desired;
      }
      break;   
  }
}


//accepts list of arguments and a list of desired arguments. Returns an object with arguments streamlined, or error message
ab.inputHandling.doIt = function(args, desiredArgs) {
  var i = 0;
  var streamlined = {};
  var argTypes = [];
  var errorOccured;
  
  var generateErrorMessage = function() {
    var msg = "Unexpected arguments provided. Expected: ";
    desiredArgs.forEach(function(desired, i) {
      msg += desired.name + (argTypes[i] || desired.optional ? ' (' + (desired.optional? 'optional' : '') + (argTypes[i]? (desired.optional? ' - ' : '') + argTypes[i]: '') + ')' : '');
      
      if((i + 1) === desiredArgs.length) {
        msg += '.';
      } else {
        msg += ', ';
      }
    });
    
    return msg;
  }
  
  for(var j = 0; j < desiredArgs.length;j+=1) {
    var e;
    if(!(e = isInputErrornous(args[i], desiredArgs[j].type))) {
      streamlined[desiredArgs[j].name] = args[i];
      i+=1;
    } else if(desiredArgs[j].optional) {
      streamlined[desiredArgs[j].name] = desiredArgs[j].defaultVal;
    } else {
      errorOccured = true;
      i+=1;
    }
    argTypes[j] = e;
  }
  
  return (errorOccured || (i < args.length)) ? {error: generateErrorMessage()} : streamlined;
}

module.exports = ab.inputHandling;