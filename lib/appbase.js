var ab = {
  cache: {},
  server: {
    realtime:{}
  },
  interface: {},
  util: {},
  firing: {}
}

var Appbase = {}

ab.server.realtime.socket = io('http://aphrodite.api1.appbase.io:80/')
ab.server.realtime.emittedEvents = []
ab.server.realtime.emit = function(url,type,data){
  ab.server.realtime.emittedEvents.push({url:url,data:data,type:type})
  ab.server.realtime.socket.emit.call(ab.server.realtime.socket,type,data)
}
ab.server.realtime.socket.on('reconnect',function() {
  console.log('reconnect')
  //re-emit events, with timestamp
  ab.server.realtime.emittedEvents.forEach(function(event) {
    event.data.timestamp = ab.cache.timestamps[event.url][event.type === 'properties'?'vertex':event.type]
    console.log('re-emitting:',event)
    ab.server.realtime.socket.emit.call(ab.server.realtime.socket,event.type,event.data)
  })
})

ab.cache = {
  memStore: {},
  timestamps:{},
  newVertices:{},
  // Vertex cache methods - set, get, remove
  set: function(type, url, data) {
    if (!ab.cache.memStore.hasOwnProperty(url)){
      ab.cache.memStore[url] = {"vertex":{}, "edges":{}}
      ab.cache.timestamps[url] = {}
    }

    for (var key in data) {
      if(type !== 'vertex' || (key != '_id' && key != 'timestamp')) {
        ab.cache.memStore[url][type][key] = data[key]
        if(type === 'edges' && (ab.cache.timestamps[url][type] === undefined || ab.cache.timestamps[url][type] < data[key]['timestamp'] ))
          ab.cache.timestamps[url][type] = data[key]['timestamp']
      }
    }

    if(type === 'vertex')
      ab.cache.timestamps[url][type] = data['timestamp']
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
      for (var key in data)
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
    ab.server.realtime.socket.on(JSON.stringify(data), function(result) {
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
            ab.cache.remove("vertex", url, Object.keys(result.vertex))
            break
          default :
            ab.cache.set("vertex", url, result.vertex)
        }
        result.vertexCache = ab.cache.get("vertex", url)
        ab.firing.prepareForProperties(result.optype, url, previous, result.vertexCache)
        callback(null, result)
      }
    })
    ab.server.realtime.emit(url,"properties", data)
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
    ab.server.realtime.socket.on(JSON.stringify(data), function(result) {
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
            ab.cache.remove("edges",url,Object.keys(result.edges))
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
    ab.server.realtime.emit(url,"edges", data)
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

  exports.on = function(event,callback) {
    var checkForCreationAndGoAhead = function() {
      if(ab.cache.newVertices[path]) {
        setTimeout(checkForCreationAndGoAhead,200)
      } else {
        if(event == 'properties')
          internalFunctions.onProperties(callback)
        else internalFunctions.onEdges(event,callback)
      }
    }
    checkForCreationAndGoAhead()
  }

  exports.off = function(event) {
    if(event){
      amplify.unsubscribe(event+":"+exports.URL(), referenceID)
    } else {
      amplify.unsubscribe("properties:" + exports.URL(), referenceID)
      amplify.unsubscribe("edge_added:" + exports.URL(), referenceID)
      amplify.unsubscribe("edge_removed:" + exports.URL(), referenceID)
      amplify.unsubscribe("edge_changed:" + exports.URL(), referenceID)
    }
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

    var checkForCreationAndGoAhead = function() {
      if(ab.cache.newVertices[path]) {
        setTimeout(checkForCreationAndGoAhead,200)
      } else {
        ab.server.vertex.delete(exports.URL(), {data:data, all:all}, function(error) {
          callback(error, exports)
        })
      }
    }
    checkForCreationAndGoAhead()
  }

  exports.setEdge = function(ref,name,priority, callback) {
    if(typeof priority == 'function' && callback === undefined){
      var callback = priority
      priority = undefined
    } else if(ref && name && priority && callback){

    } else {
      throw 'Invalid arguments.'
    }

    var data = {}

    data[name] = {
      path: ref.path(),
      order: priority
    }

    var checkForCreationAndGoAhead = function() {
      if(ab.cache.newVertices[path]) {
        setTimeout(checkForCreationAndGoAhead,200)
      } else {
        ab.server.edges.set(exports.URL(), data, function(error, result) {
          if(!error) {
            callback(error,exports)
          } else {
            callback(error)
          }
        })
      }
    }
    checkForCreationAndGoAhead()
  }

  exports.removeEdge = function(edgeName,callback) {
    var checkForCreationAndGoAhead = function() {
      if(ab.cache.newVertices[path]) {
        setTimeout(checkForCreationAndGoAhead,200)
      } else {
        ab.server.edges.delete(exports.URL(),{data:[edgeName]},function(error,result) {
          if(!error) {
            callback(error,exports)
          } else {
            callback(error)
          }
        })
      }
    }
    checkForCreationAndGoAhead()
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
          ab.firing.fireForEdges(url, "edge_removed", previous[edgeName], {}, edgeName, callback)
        }
        break
      case "REMOVE":
        for(var edgeName in current) {
          if(previous[edgeName] !== undefined)
            ab.firing.fireForEdges(url, "edge_removed", previous[edgeName], {}, edgeName, callback)
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

Appbase.setApp = function(appName,apiVersion){
  ab.server.setBaseURL('http://'+ appName + '.' + 'api' + apiVersion + '.appbase.io')
}

ab.server.setBaseURL = function(baseURL) {
  ab.server.baseURL = ab.util.cutLeadingTrailingSlashes(baseURL)
}

ab.server.getBaseURL = function() {
  return ab.server.baseURL
}

Appbase.ref = function(path) {
  return ab.interface.ref(path)
}

Appbase.create = function(namespace,key) {
  if(key === undefined){
    key = ab.util.uuid()
  } else if (namespace && key){
  } else {
    throw 'Invalid arguments'
  }
  var path = namespace+'/'+key
  ab.cache.newVertices[path] = true
  ab.server.vertex.set(ab.util.pathToURL(path), {}, function(error) {
    delete ab.cache.newVertices[path]
  })

  return ab.interface.ref(path)
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