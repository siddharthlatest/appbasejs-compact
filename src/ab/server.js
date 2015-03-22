var config = require("./../config.js");
var ab = require("./index.js");
var atomic = require("./../atomic.js");
var io = require('socket.io-client');
ab.server = {
  realtime: {
  }
}

ab.server.timestamp = function(cb) {
  atomic.get(config.appbaseApiServer + "/time")
    .success(function(result) {
      cb(null, result)
    })
    .error(function(error) {
      cb(error)
    })
}

//making a get request to server before connecting to io - this some how relates to autoscaling of api server
var connectSocket = function() {
  ab.server.timestamp(function(error) {
    if(!error) {
      ab.server.realtime.socket = io(config.appbaseApiServer + ':' + (config.protocol === "https" ? 443 : 80));
    } else {
      //try again
      setTimeout(connectSocket, 500);
    }
  })
}
connectSocket();

//setup a socket proxy for delaying calls to io socket until the socket is ready - always call proxy instead of direct 
ab.server.realtime.socketProxy = {};
["on", "emit", "removeListener"].forEach(function(method) {
  ab.server.realtime.socketProxy[method] = function() {
    var args = arguments;
    var callSocket = function() {
      if(ab.server.realtime.socket) { //check if the socket is ready
        ab.server.realtime.socket[method].apply(ab.server.realtime.socket, args);
      } else {
        setTimeout(callSocket, 200);
      }
    }
    callSocket();
  }
})

ab.server.realtime.socketProxy.on('reconnect', function() {
  //re-emit events, with timestamp
  for(var url in ab.server.ns.namespacesListening){
    //timestamp dsnt work for namespaces ab.server.ns.namespacesListening[url].timestamp = ab.cache.ns.timestamps[url]
    ab.server.realtime.socketProxy.emit('new vertices', ab.server.ns.namespacesListening[url])
  }

  for(var url in ab.server.vertex.urlsListening){
    ab.server.vertex.urlsListening[url].timestamp = ab.cache.timestamps[url] !== undefined?
      ab.cache.timestamps[url]['vertex']:undefined
    ab.server.realtime.socketProxy.emit('properties', ab.server.vertex.urlsListening[url])
  }

  for(var url in ab.server.edges.urlsListening){
    ab.server.edges.urlsListening[url].timestamp = ab.cache.timestamps[url] !== undefined?
     ab.cache.timestamps[url]['edges']:undefined
    ab.server.realtime.socketProxy.emit('edges', ab.server.vertex.urlsListening[url])
  }
})

ab.server.rawSearch = function(query, callback) {
  var data = {
    "query": query
  }
  ab.util.setCredsInData(data)
  atomic.post(ab.server.baseURL + '/~rawsearch', data)
   .success(function(result) {
     if(typeof result === 'string') {
       callback(new Error(result))
     } else {
       callback(null, result)
     }
   })
   .error(callback)
}

ab.server.search = function(namespace, query, callback) {
  var data = {
    "query": query
  }
  ab.util.setCredsInData(data)
  atomic.post(ab.server.baseURL + '/' + namespace + "/~search", data)
   .success(function(result) {
     if(typeof result === 'string') {
       callback(new Error(result))
     } else {
       callback(null, result)
     }
   })
   .error(callback)
}

ab.server.ns = {
  namespacesListening: {},
  listen: function(url, requestdata, callback) {
    var data = ab.util.parseURL(url)
    data["filters"] = requestdata.filters
    data["listener_id"] = ab.util.uuid()
    delete data["key"]
    delete data["obj_path"]
    ab.util.setCredsInData(data)
    var event = JSON.stringify(data)
    var listener
    ab.server.realtime.socketProxy.on(event, listener = function(result) {
      if(typeof result === 'string') {
        delete ab.server.edges.urlsListening[url]
        if(result === 'STOPPED') {
          ab.server.realtime.socketProxy.removeListener(event,listener)
          return
        }
        try {
          callback(new Error(result))
        } catch(e) {
          //throwing the error in a different function as socket io would crash otherwise
          setTimeout(0, function() {
            throw e;
          })
        }
      } else {
        try {
          if(result instanceof Array) {
            var previous = ab.cache.get('edges', url)
            var newVertices = {}
            var presentVertices = {};
            result.forEach(function(v) {
              var pKey = v.rootPath.slice(v.rootPath.indexOf('/') + 1);
              presentVertices[pKey] = true;
              if (!previous[pKey])
                newVertices[pKey] = v;
            })
            
            ab.cache.set('edges', url, newVertices);
            ab.firing.prepareForNS('RETR', url, previous, newVertices);
            
            // removing vertices not present in 'result'
            for(var pKey in previous) {
              if(!presentVertices[pKey]) {
                ab.cache.remove('edges', url, [pKey]);
                var removeObj = {
                  pKey: true
                };
                ab.firing.prepareForNS('DESTROY', url, previous, removeObj);
              }
            }
          } else { // single vertex
            var v = result.vertex
            var pKey = v.rootPath ? v.rootPath.slice(v.rootPath.indexOf('/') + 1) : undefined
            if(pKey) {
              var previous = ab.cache.get('edges', url)
              var vertices = {}
              vertices[pKey] = v
              switch(result.optype) {
                case 'DESTROY':
                  ab.cache.remove('edges',url, [pKey])
                  break
                case 'UPDATE':
                  ab.cache.set('edges', url, vertices)
                  break
              }
              ab.firing.prepareForNS(result.optype, url, previous, vertices)
            } else {
              //ignore if no 'rootPath' exists in the vertex
            }
          }

        } catch(e) {
          //throwing the error in a different function as socket io would crash otherwise
          setTimeout(0, function() {
            throw e;
          })
        }

        try {
          callback(null, result)
        } catch(e) {
          try {
            callback(e)
          } catch(e1) {
            //throwing the error in a different function as socket io would crash otherwise
            setTimeout(0, function() {
              throw e1;
            })
          }
        }
      }
    })

    ab.server.ns.namespacesListening[url] = data
    ab.server.realtime.socketProxy.emit("new vertices", data)
  },
  unlisten: function(url) {
    var data = ab.server.ns.namespacesListening[url]
    delete ab.server.ns.namespacesListening[url]
    //empty cache
    ab.cache.memStore[url] && (ab.cache.memStore[url] = {})
    if(data) {
      delete data.timestamp
      ab.server.realtime.socketProxy.emit("new vertices off", data)
    }
  }
}

ab.server.vertex = {
  urlsListening: {},
  get: function(url, callback){
    var data = {
      "data":[""]
    }
    ab.util.setCredsInData(data)
    atomic.post(url + "/~properties", data)
      .success(function(result) {
        if(typeof result === 'string') {
          callback(new Error(result))
        } else {
          callback(null, result)
        }
      })
      .error(callback)
  },
  set: function(url, d, callback, timestamp) {
    // catch data validation errors at the user interface level function
    var data = {"data":d, timestamp: timestamp}
    ab.util.setCredsInData(data)
    atomic.patch(url + "/~properties", data)
     .success(function(result) {
       if(typeof result === 'string') {
         callback(new Error(result))
       } else {
         callback(null, result)
       }
     })
     .error(callback)
  },
  listen: function(url, requestdata, callback) {
    // url format - 'http://appname.localhost:5005/Materials/Ice/dad/dsd'
    var data = ab.util.parseURL(url)
    data["all"] = requestdata.all
    data["data"] = requestdata.data
    data["listener_id"] = ab.util.uuid()
    ab.util.setCredsInData(data)
    var event = JSON.stringify(data)
    var listener
    ab.server.realtime.socketProxy.on(event, listener = function(result) {
      if(typeof result === 'string') {
        delete ab.server.vertex.urlsListening[url]
        if(result === 'STOPPED') {
          ab.server.realtime.socketProxy.removeListener(event,listener)
          return
        }
        try {
          callback(new Error(result))
        } catch(e) {
          //throwing the error in a different function as socket io would crash otherwise
          setTimeout(0, function() {
            throw e;
          })
        }
      } else {
        var previous = ab.cache.get("vertex", url)
        switch(result.optype) {
          case 'REMOVE ALL':
            ab.cache.remove("vertex", url)
            break
          case 'REMOVE':
            ab.cache.remove("vertex", url, Object.keys(result.vertex))
            break
          default :
            ab.cache.set("vertex", url, result.vertex)
        }
        result.vertexCache = ab.cache.get("vertex", url)
        try{
          ab.firing.prepareForProperties(result.optype, url, previous, result.vertexCache)
        } catch(e) {
          try {
            callback(e);
          } catch(e) {
            //throwing the error in a different function as socket io would crash otherwise
            setTimeout(0, function() {
              throw e;
            })
          }
        }

        try {
          callback(null, result);
        } catch(e) {
          try {
            callback(e);
          } catch(e) {
            //throwing the error in a different function as socket io would crash otherwise
            setTimeout(0, function() {
              throw e;
            })
          }
        }
      }
    })
    ab.server.vertex.urlsListening[url] = data
    ab.server.realtime.socketProxy.emit("properties", data)
  },
  unlisten: function(url) {
    var data = ab.server.vertex.urlsListening[url]
    delete ab.server.vertex.urlsListening[url]
    //empty cache
    ab.cache.memStore[url] && (ab.cache.memStore[url]['vertex'] = {})
    if(data) {
      delete data.timestamp
      ab.server.realtime.socketProxy.emit("properties off", data)
    }
  },
  delete: function(url, data, callback) {
    ab.util.setCredsInData(data)
    atomic.delete(url+"/~properties", data)
      .success(function(result) {
        if(typeof result === 'string') {
          callback(new Error(result))
        } else {
          callback(null, result)
        }
      })
      .error(callback)
  },
  destroy: function(url, callback) {
    var data = {all: true}
    ab.util.setCredsInData(data)
    atomic.delete(url, data)
      .success(function(result) {
        if(typeof result === 'string') {
          callback(new Error(result))
        } else {
          callback(null, result)
        }
      })
      .error(callback)
  }
} /* End of server vertices */

ab.server.edges = {
  urlsListening: {},
  set: function(url, d, callback) {
    // catch data validation errors at the user interface level function
    var data = {"data":d}
    ab.util.setCredsInData(data)
    atomic.patch(url + "/~edges", data)
     .success(function(result) {
       if(typeof result === 'string') {
         callback(new Error(result))
       } else {
         callback(null, result)
       }
     })
     .error(callback)
  },
  unlisten: function(url) {
    var data = ab.server.edges.urlsListening[url]
    delete ab.server.edges.urlsListening[url]
    //empty cache
    ab.cache.memStore[url] && (ab.cache.memStore[url]['edges'] = {})
    if(data) {
      delete data.timestamp
      ab.server.realtime.socketProxy.emit("edges off", data)
    }
  },
  listen: function(url, requestdata, callback) {
    var data = ab.util.parseURL(url)
    url += ab.util.generateFilterString(requestdata)
    data["filters"] = requestdata.filters
    data["listener_id"] = ab.util.uuid()
    ab.util.setCredsInData(data)
    var event = JSON.stringify(data)
    data.timestamp = requestdata.timestamp
    var listener
    ab.server.realtime.socketProxy.on(event, listener = function(result) {
      if(typeof result === 'string') {
        delete ab.server.edges.urlsListening[url]
        if(result === 'STOPPED') {
          ab.server.realtime.socketProxy.removeListener(event,listener)
          return
        }
        try {
          callback(new Error(result))
        } catch(e) {
          //throwing the error in a different function as socket io would crash otherwise
          setTimeout(0, function() {
            throw e;
          })
        }
      } else {
        var previous = ab.cache.get("edges", url)
        try {
          switch(result.optype) {
            case 'REMOVE ALL':
              ab.cache.remove("edges", url)
              ab.firing.prepareForEdges(result.optype, url, previous, {})
              break
            case 'REMOVE':
              ab.cache.remove("edges", url, Object.keys(result.edges))
              ab.firing.prepareForEdges(result.optype, url, previous, result.edges)
              break
            default:
              for(var edge in result.edges) {
                if(result.edges[edge].t_id === "") {
                  delete result.edges[edge]
                }
              }
              ab.cache.set("edges", url, result.edges)
              ab.firing.prepareForEdges(result.optype, url, previous, result.edges)
          }
        } catch(e) {
          
          //throwing the error in a different function as socket io would crash otherwise
          setTimeout(0, function() {
            throw e;
          })
        }
        result.edgeCache = ab.cache.get("edges", url)
        try {
          callback(null, result)
        } catch(e) {
          try {
            callback(e)
          } catch (e1) {
            //throwing the error in a different function as socket io would crash otherwise
            setTimeout(0, function() {
              throw e1;
            })
          }
        }
      }
    })

    ab.server.edges.urlsListening[url] = data
    if(ab.cache.timestamps[url] === undefined) ab.cache.timestamps[url] = {}
    ab.cache.timestamps[url]['edges'] = requestdata.timestamp
    data.timestamp = requestdata.timestamp
    ab.server.realtime.socketProxy.emit("edges", data)
  },
  delete: function(url, data, callback) {
    ab.util.setCredsInData(data)
    atomic.delete(url+"/~edges", data)
     .success(function(result) {
       if(typeof result === 'string') {
         callback(new Error(result))
       } else {
         callback(null, result)
       }
     })
     .error(callback)
  }
} /* End of server edges */


ab.server.setBaseURL = function(baseURL) {
  ab.server.baseURL = ab.util.cutLeadingTrailingSlashes(baseURL)
}

ab.server.setApp = function(app) {
  ab.server.app = app
}

ab.server.getApp = function(){
  return ab.server.app
}

ab.server.setAppSecret = function(appSecret) {
  ab.server.appSecret = appSecret
}

ab.server.setAppbaseToken = function(token) {
  ab.server.appbaseToken = token
}

ab.server.getAppbaseToken = function() {
  return ab.server.appbaseToken
}

ab.server.getAppSecret = function() {
  return ab.server.appSecret
}

ab.server.getBaseURL = function() {
  return ab.server.baseURL
}

module.exports = ab.server;