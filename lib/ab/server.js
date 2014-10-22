var ab = require("./index.js");
var atomic = require("./../atomic.js");
var io = require('socket.io-client');
ab.server = {
  realtime: {
  }
}
ab.server.realtime.socket = io('https://api.appbase.io:443');
ab.server.realtime.socket.on('reconnect', function() {
  console.log('reconnect')
  //re-emit events, with timestamp
  for(var url in ab.server.ns.namespacesListening){
    ab.server.ns.namespacesListening[url].timestamp = ab.cache.ns.timestamps[url]
    console.log('re-emitting:', url,'ns')
    ab.server.realtime.socket.emit('new vertices', ab.server.ns.namespacesListening[url])
  }

  for(var url in ab.server.vertex.urlsListening){
    ab.server.vertex.urlsListening[url].timestamp = ab.cache.timestamps[url] !== undefined?
      ab.cache.timestamps[url]['vertex']:undefined
    console.log('re-emitting:', url,'properties')
    ab.server.realtime.socket.emit('properties', ab.server.vertex.urlsListening[url])
  }

  for(var url in ab.server.edges.urlsListening){
    ab.server.edges.urlsListening[url].timestamp = ab.cache.timestamps[url] !== undefined?
     ab.cache.timestamps[url]['edges']:undefined
    console.log('re-emitting:', url,'edges')
    ab.server.realtime.socket.emit('edges', ab.server.vertex.urlsListening[url])
  }
})

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
    ab.server.realtime.socket.on(event, listener = function(result) {
      if(typeof result === 'string') {
        delete ab.server.edges.urlsListening[url]
        if(result === 'STOPPED'){
          ab.server.realtime.socket.removeListener(event,listener)
          return
        }
        try {
          callback(new Error(result))
        } catch(e) {
          console.error(url,e)
        }
      } else {
        try {
          if(result[0] !== undefined) { //array of vertices
            var previous = ab.cache.get('edges', url)
            var newVertices = {}
            result.forEach(function(v) {
              var pKey = v.rootPath.slice(v.rootPath.indexOf('/') + 1)
              newVertices[pKey] = v
            })
            ab.cache.set('edges', url, newVertices)
            ab.firing.prepareForNS('RETR', url, previous, newVertices)
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
          console.error(url,e)
        }

        try {
          callback(null, result)
        } catch(e) {
          console.error(url,e)
        }
      }
    })

    ab.server.ns.namespacesListening[url] = data
    ab.server.realtime.socket.emit("new vertices", data)
  },
  unlisten: function(url) {
    var data = ab.server.ns.namespacesListening[url]
    delete ab.server.ns.namespacesListening[url]
    //empty cache
    ab.cache.memStore[url] && (ab.cache.memStore[url] = {})
    if(data) {
      delete data.timestamp
      ab.server.realtime.socket.emit("new vertices off", data)
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
    ab.server.realtime.socket.on(event, listener = function(result) {
      if(typeof result === 'string') {
        delete ab.server.vertex.urlsListening[url]
        if(result === 'STOPPED') {
          ab.server.realtime.socket.removeListener(event,listener)
          return
        }
        try {
          callback(new Error(result))
        } catch(e) {
          console.error(url,e)
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
          console.error(url,e)
        }

        try {
          callback(null, result)
        } catch(e) {
          console.error(url,e)
        }
      }
    })
    ab.server.vertex.urlsListening[url] = data
    ab.server.realtime.socket.emit("properties", data)
  },
  unlisten: function(url) {
    var data = ab.server.vertex.urlsListening[url]
    delete ab.server.vertex.urlsListening[url]
    //empty cache
    ab.cache.memStore[url] && (ab.cache.memStore[url]['vertex'] = {})
    if(data) {
      delete data.timestamp
      ab.server.realtime.socket.emit("properties off", data)
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
      ab.server.realtime.socket.emit("edges off", data)
    }
  },
  listen: function(url, requestdata, callback) {
    // url format - 'http://appname.localhost:5005/Materials/Ice/dad/dsd'
    var data = ab.util.parseURL(url)
    data["filters"] = requestdata.filters
    data["listener_id"] = ab.util.uuid()
    ab.util.setCredsInData(data)
    var event = JSON.stringify(data)
    var listener
    ab.server.realtime.socket.on(event, listener = function(result) {
      if(typeof result === 'string') {
        delete ab.server.edges.urlsListening[url]
        if(result === 'STOPPED'){
          ab.server.realtime.socket.removeListener(event,listener)
          return
        }
        try {
          callback(new Error(result))
        } catch(e) {
          console.error(url,e)
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
          console.error(url,e)
        }
        result.edgeCache = ab.cache.get("edges", url)
        try {
          callback(null, result)
        } catch(e) {
          console.error(url,e)
        }
      }
    })

    ab.server.edges.urlsListening[url] = data
    ab.server.realtime.socket.emit("edges", data)
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

ab.server.timestamp = function(cb) {
  atomic.get("https://api.appbase.io/time")
    .success(function(result) {
      cb(null, result)
    })
    .error(function(error) {
      cb(error)
    })
}

module.exports = ab.server;