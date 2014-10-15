ab = require("./index.js");
ab.util = {
  setCredsInData: function(data) {
    if(ab.server.getAppSecret()) {
      data.secret = ab.server.getAppSecret();
    } else {
      data.token = ab.server.getAppbaseToken();
    }
    return data
  },
  createVertexSnapshot: function(previous, current) {
    current = JSON.parse(JSON.stringify(current));
    previous = JSON.parse(JSON.stringify(previous));
    return {
      properties: function() {
        return current;
      },
      prevProperties: function() {
        return previous;
      }
    }
  },
  createEdgeSnapshot: function(previous, current, edgeName) {
    return {
      name: function() {
        return edgeName;
      },
      prevPriority: function() {
        return previous.order;
      },
      priority: function() {
        return current.order;
      }
    };
  },
  cutLeadingTrailingSlashes: function(input) {
    while(input.charAt(input.length - 1) === '/') {
      input = input.slice(0,-1);
    }
    while(input.charAt(0) === '/') {
      input = input.slice(1);
    }
    return input;
  },
  pathToURL: function(path) {
    if(ab.server.baseURL) {
      return ab.server.baseURL+ '/' +ab.util.cutLeadingTrailingSlashes(path);
    } else {
      throw 'baseURL is not set.';
    }
  },
  URLToPath: function(URL) {
    return URL.replace(ab.server.baseURL + '/','');
  },
  uuid: function() {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    })
  },
  parseURL: function(url) {
    var intermediate;
    intermediate = url.split(/\/\/(.+)?/)[1].split(/\.(.+)?/);
    var appname = intermediate[0];
    intermediate = intermediate[1].split(/\/(.+)?/)[1].split(/\/(.+)?/);
    var namespace = intermediate[0];
    if(intermediate[1]) {
      intermediate = intermediate[1].split(/\/(.+)?/);
      var key = intermediate[0];
      var obj_path = intermediate[1];
    }
    return {
      appname: appname,
      namespace: namespace,
      key: key,
      obj_path: obj_path
    };
  }
}

module.exports = ab.util;