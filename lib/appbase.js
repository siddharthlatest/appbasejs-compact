var ab = {
  cache: {},
  server: {},
  interface: {},
  util: {},
  firing: {}
}

var Appbase = {}

var socket = io('http://sagar.appbase.io:80/')

ab.cache = {
  memStore: {},
  // Vertex cache methods - set, get, remove
  set: function(type, url, data) {
    if (!ab.cache.memStore.hasOwnProperty(url))
      ab.cache.memStore[url] = {"vertex":{}, "edges":{}}
    for (key in data)
      if(key != '_id' && key != 'timestamp')
        ab.cache.memStore[url][type][key] = data[key]
  },
  get: function(type, url, isClone) {
    var isClone = typeof isClone !== 'undefined' ? isClone : true
    if (isClone && ab.cache.memStore.hasOwnProperty(url)) {
      return JSON.parse(JSON.stringify(ab.cache.memStore[url][type]))
    } else if (!isClone && ab.cache.memStore.hasOwnProperty(url)) {
      return ab.cache.memStore[url][type]
    } else {
      return {}
    }
  },
  remove: function(type, url, data) {
    if (ab.cache.memStore.hasOwnProperty(url) && typeof data === "undefined")
      ab.cache.memStore[url][type] = {}
    else if (ab.cache.memStore.hasOwnProperty(url)) {
      for (key in data)
        delete ab.cache.memStore[url][type][data[key]]
    }
  }
}

ab.server.vertex = {
  urlsListening:{},
  set: function(url, data, callback) {
    // catch data validation errors at the user interface level function
    atomic.patch(url + "/~properties", {"data":data})
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
    socket.on(JSON.stringify(data), function(result) {
      if(typeof result === 'string') {
        callback(new Error(result))
      } else {
        ab.server.vertex.urlsListening[url] = true
        var previous = ab.cache.get("vertex", url)
        switch(result.optype) {
          case 'REMOVE ALL':
            ab.cache.remove("vertex", url)
            break
          case 'REMOVE':
            ab.cache.remove("vertex", url, result.vertex.keys())
            break
          default :
            ab.cache.set("vertex", url, result.vertex)
        }
        result.vertexCache = ab.cache.get("vertex", url)
        ab.firing.prepareForProperties(result.optype, url, previous, result.vertexCache)
        callback(null, result)
      }
    })
    socket.emit("properties", JSON.stringify(data))
  },
  delete: function(url, data, callback) {
    atomic.delete(url+"/~properties", data)
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
  set: function(url, data, callback) {
    // catch data validation errors at the user interface level function
    atomic.patch(url + "/~edges", {"data":data})
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
    data["filters"] = requestdata.filters
    socket.on(JSON.stringify(data), function(result) {
      if(typeof result === 'string') {
        callback(new Error(result))
      } else {
        ab.server.edges.urlsListening[url] = true
        var previous = ab.cache.get("edges", url)
        switch(result.optype){
          case 'REMOVE ALL':
            ab.cache.remove("edges", url)
            ab.firing.prepareForEdges(result.optype,url,previous,{})
            break
          case 'REMOVE':
            ab.cache.remove("edges",url,result.edges.keys())
            ab.firing.prepareForEdges(result.optype,url,previous,result.edges)
            break
          default :
            ab.cache.set("edges",url,result.edges)
            ab.firing.prepareForEdges(result.optype,url,previous,result.edges)
        }
        result.edgeCache = ab.cache.get("edges", url)

        callback(null, result)
      }
    })
    socket.emit("edges", JSON.stringify(data))
  },
  delete: function(url, data, callback) {
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

ab.interface.ref = function(path) {
  var referenceID = ab.util.uuid()

  var internalFunctions = {
    onProperties: function(interfaceCallback) {
      if(ab.server.vertex.urlsListening[exports.URL()]) {
        ab.firing.prepareForProperties('RETR',exports.URL(),{},ab.cache.get('vertex',exports.URL()),interfaceCallback)
      }
      amplify.subscribe("properties:"+exports.URL(),referenceID,interfaceCallback)
      if(!ab.server.vertex.urlsListening[exports.URL()]) {
        ab.server.vertex.listen(exports.URL(), {all:true}, function(error,request){
          if(error) {
            interfaceCallback(error)
            amplify.unsubscribe("properties:"+exports.URL(), referenceID)
          }
        })
      }
    },
    onEdges: function(event,interfaceCallback) {
      if(ab.server.edges.urlsListening[exports.URL()]) {
        if(event == "edge_added")
          ab.firing.prepareForEdges('RETR',exports.URL(),{},ab.cache.get('edges',exports.URL()),interfaceCallback)
      }
      amplify.subscribe(event+":"+exports.URL(),referenceID,interfaceCallback)
      if(!ab.server.edges.urlsListening[exports.URL()]) {
        ab.server.edges.listen(exports.URL(), {all:true}, function(error,request) {
          if(error) {
            interfaceCallback(error)
            amplify.unsubscribe(event+":"+exports.URL(), referenceID)
          }
        })
      }
    }
  }

  var exports = {}

  exports.URL = function(){
    return ab.util.pathToURL(path)
  }

  exports.path = function() {
    return path
  }

  exports.outVertex = function(edgeName) {
    return new ab.interface.ref(path+'/'+edgeName)
  }

  exports.inVertex = function(edgeName) {
    return new ab.interface.ref(path.slice(0,path.lastIndexOf('/')))
  }

  exports.on = function(event,callback){
    if(event == 'properties')
      internalFunctions.onProperties(callback)
    else internalFunctions.onEdges(event,callback)
  }

  exports.setData = function(data, callback) {
    ab.server.vertex.set(exports.URL(), data, function(error) {
      callback(error, exports)
    })
  }

  exports.removeData = function(data, callback) {
    if(typeof data === "boolean") {
      if(data) {
        var all = data
        data = undefined
      } else {
        throw "data can't be `false`."
      }
    }
    ab.server.vertex.delete(exports.URL(), {data:data, all:all}, function(error) {
      callback(error, exports)
    })
  }

  exports.setEdge = function(edgeData, callback) {
    if(edgeData.priority === undefined) {
      edgeData.priority = null
    }
    var data = {}
    var parsedURL = ab.util.parseURL(edgeData.ref.URL())

    data[edgeData.name] = {
      path: parsedURL.namespace+'/'+parsedURL.key,
      order: edgeData.priority === null? undefined:edgeData.priority
    }
    ab.server.edges.set(exports.URL(), data, function(error, result) {
      if(!error) {
        callback(error,exports)
      } else {
        callback(error)
      }
    })
  }

  exports.removeEdge = function(edgeData,callback) {
    ab.server.edges.delete(exports.URL(),{data:[edgeData.name]},function(error,result) {
      if(!error) {
        callback(error,exports)
      } else {
        callback(error)
      }
    })
  }

  return exports
}

ab.firing = {
  prepareForProperties: function(optype,url,previous,current,callback) {
    ab.firing.fireForProperties(url,previous,current,callback)
  },
  prepareForEdges: function(optype,url,previous,current,callback) {
    switch(optype) {
      case "REMOVE ALL":
        for(var edgeName in previous) {
          ab.firing.fireForEdges(url, "edge_remove", previous[edgeName], {}, edgeName, callback)
        }
        break
      case "REMOVE":
        for(var edgeName in current && previous[edgeName] !== undefined) {
          ab.firing.fireForEdges(url, "edge_remove", previous[edgeName], {}, edgeName, callback)
        }
        break
      default :
        for(var edgeName in current) {
          if(previous[edgeName] !== undefined) ab.firing.fire(url, "edge_changed", previous[edgeName], current[edgeName], edgeName, callback)
          else ab.firing.fireForEdges(url, "edge_added", {},current[edgeName], edgeName, callback)
        }
    }
  },
  fireForProperties: function(url, previous, current, callback) {
    var vertexSnapshot = ab.util.createVertexSnapshot(previous,current)
    if(typeof callback == 'function') {
      callback(null,ab.interface.ref(ab.util.URLToPath(url)),vertexSnapshot)
    } else {
      amplify.publish('properties:'+url,null,ab.interface.ref(ab.util.URLToPath(url)),vertexSnapshot)
    }
  },
  fireForEdges: function(url, event, previous, current, edgeName, callback) {
    var edgeSnapshot = ab.util.createEdgeSnapshot(previous,current,edgeName)
    if(typeof callback == 'function') {
      callback(null,ab.interface.ref(ab.util.URLToPath(url)+'/'+edgeName),edgeSnapshot)
    } else {
      amplify.publish(event+':'+url,null,ab.interface.ref(ab.util.URLToPath(url)+'/'+edgeName),edgeSnapshot)
    }
  }
}

Appbase.setBaseURL = function(baseURL) {
  ab.server.baseURL = ab.util.cutLeadingTrailingSlashes(baseURL)
}

Appbase.getBaseURL = function() {
  return ab.server.baseURL
}

Appbase.ref = function(path) {
  return ab.interface.ref(path)
}

Appbase.new = function(path, callback) {
  var parsedURL = ab.util.parseURL(ab.util.pathToURL(path))
  if(parsedURL.key) {
    if(parsedURL.obj_path) {
      throw "Not in `baseUrl/namespace/key` format"
    }
  } else {
    parsedURL.key = ab.util.uuid()
    path = path+'/'+parsedURL.key
  }
  ab.server.vertex.set(ab.util.pathToURL(path), {}, function(error) {
    if(!error) {
        callback && callback(error, ab.interface.ref(path))
    } else {
        callback && callback(error)
    }
  })
}

ab.util = {
  createVertexSnapshot: function(previous,current) {
    return {
      properties: function() {
        return current
      },
      prevProperties: function() {
        return previous
      }
    }
  },
  createEdgeSnapshot: function(previous, current, edgeName) {
    return {
      name: function() {
        return edgeName
      },
      prevPriority: function() {
        return previous.order
      },
      priority: function() {
        return current.order
      }
    }
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
      return ab.server.baseURL+ '/' +ab.util.cutLeadingTrailingSlashes(path)
    } else {
      throw 'baseURL is not set.'
    }
  },
  URLToPath: function(URL) {
    return URL.replace(ab.server.baseURL + '/','')
  },
  uuid: function() {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8)
      return v.toString(16)
    })
  },
  parseURL: function(url) {
    var intermediate
    intermediate = url.split(/\/\/(.+)?/)[1].split(/\.(.+)?/)
    var appname = intermediate[0]
    intermediate = intermediate[1].split(/\/(.+)?/)[1].split(/\/(.+)?/)
    var namespace = intermediate[0]
    if(intermediate[1]){
      intermediate = intermediate[1].split(/\/(.+)?/)
      var key = intermediate[0]
      var obj_path = intermediate[1]
    }
    return {
      appname: appname,
      namespace: namespace,
      key: key,
      obj_path: obj_path
    }
  }
}