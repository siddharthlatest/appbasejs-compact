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
        ab.firing.fire(result.optype, url, previous, result.vertexCache)
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
        var previous = ab.cache.get("edges", url)
        switch(result.optype){
          case 'REMOVE ALL':
            ab.cache.remove("edges", url)
            break
          case 'REMOVE':
            ab.cache.remove("edges",url,result.edges.keys())
            break
          default :
            ab.cache.set("edges",url,result.edges)
        }
        result.edgeCache = ab.cache.get("edges", url)
        ab.firing.fire(result.optype,url,previous,result.edgeCache)
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
  fire: function(optype,url,previous,current) {
    console.log(optype,url,previous,current)
  }
}

Appbase.setBaseURL = function(baseURL) {
  ab.server.baseURL = ab.util.cutLeadingTrailingSlashes(baseURL)
}

Appbase.getBaseURL = function(baseURL) {
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
    if(ab.server.baseURL){
      return ab.server.baseURL+'/' +ab.util.cutLeadingTrailingSlashes(path)
    } else {
      throw 'baseURL is not set.'
    }
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