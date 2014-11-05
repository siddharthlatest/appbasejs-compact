if(typeof window === 'undefined')
  var XMLHttpRequest = require('xhr2'); //node compatibility
else
  var XMLHttpRequest = window.XMLHttpRequest;

var atomic = {};
(function() {
  var parse = function (req) {
    var result;
    if (req.status === 204) 
        result = '101: Resource does not exist';
    else 
    try {
      result = JSON.parse(req.responseText);
    } catch (e) {
      result = req.responseText;
    }
    return [result, req];
  };

  var xhr = function (type, url, data) {
    var methods = {
      success: function () {},
      error: function () {}
    };
    var XHR = XMLHttpRequest || ActiveXObject;
    var request = new XHR('MSXML2.XMLHTTP.3.0');
    request.open(type, url, true);
    request.setRequestHeader('Content-type', 'application/json');
    request.onreadystatechange = function () {
      if (request.readyState === 4) {
        if (request.status === 200) {
          methods.success.apply(methods, parse(request));
        } else {
          methods.error.apply(methods, parse(request));
        }
      }
    };
    request.send(JSON.stringify(data));
    var callbacks = {
      success: function (callback) {
        methods.success = callback;
        return callbacks;
      },
      error: function (callback) {
        methods.error = callback;
        return callbacks;
      }
    };

    return callbacks;
  };

  atomic['get'] = function (src) {
    return xhr('GET', src);
  };

  atomic['patch'] = function (url, data) {
    return xhr('PATCH', url, data);
  };

  atomic['post'] = function (url, data) {
    return xhr('POST', url, data);
  };

  atomic['delete'] = function (url, data) {
    return xhr('DELETE', url, data);
  };
}());
if(typeof module !== 'undefined' && module.exports !== undefined)
  module.exports = atomic; //browser compatibility