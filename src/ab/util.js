var ab = require("./index.js");
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
    var temp;
    return URL.slice(0, (temp = URL.indexOf(':', 5)) !== -1 ? temp : undefined).replace(ab.server.baseURL + '/','');
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
    intermediate = intermediate[1].split(/\/(.+)?/)[1].split(/\/(.+)?/);
    var appname = intermediate[0];
    intermediate = intermediate[1].split(/\/(.+)?/);
    var version = intermediate[0];
    intermediate = intermediate[1].split(/\/(.+)?/);
    var namespace = intermediate[0];
    var key;
    var obj_path;
    if(intermediate[1]) {
      intermediate = intermediate[1].split(/\/(.+)?/);
      key = intermediate[0];
      obj_path = intermediate[1];
    }
    var retObj = {
      appname: appname,
      namespace: namespace,
      key: key,
      obj_path: obj_path
    }
    return retObj;
  },
  generateFilterString: function(rData) {
    console.log('generating', rData);
    var fString = ':filters-';
    if(rData && rData.filters) {
      fString += (rData.filters.startAt !== undefined) ? 'startAt=' + rData.filters.startAt + '.' : '';
      fString += (rData.filters.endAt !== undefined) ? 'endAt=' + rData.filters.endAt + '.' : '';
      fString += (rData.filters.limit !== undefined) ? 'limit=' + rData.filters.limit + '.' : '';
      fString += (rData.filters.skip !== undefined) ? 'skip=' + rData.filters.skip + '.' : '';
    }
    return fString += (rData.timestamp !== undefined)? 'timestamp=' + rData.timestamp + '.' : '';
  }
}

module.exports = ab.util;