var ab = {
  cache: {},
	server: {},
  interface: {},
  util: {}
}

var Appbase = {}

var socket = io('http://test.localhost:5005/')

ab.cache = {
  memStore: {},
  // Vertex cache methods - set, get, remove
  set: function(type, url, data) {
    if (!ab.cache.memStore.hasOwnProperty(url))
      ab.cache.memStore[url] = {"vertex":{}, "edges":{}}
    for (key in data) ab.cache.memStore[url][type][key] = data[key]
  },
  get: function(type, url, isClone) {
    var isClone = typeof isClone !== 'undefined' ? isClone : true
    if (isClone && ab.cache.memStore.hasOwnProperty(url)) {
      return JSON.parse(JSON.stringify(ab.cache.memStore[url][type]))
    } else if (!isClone && ab.cache.memStore.hasOwnProperty(url)) {
      return ab.cache.memStore[url][type]
    } else {
      throw "url does not exist in the cache"
    }
  },
  remove: function(type, url, data) {
    if (ab.cache.memStore.hasOwnProperty(url) && typeof data === "undefined")
      ab.cache.memStore[url][type] = {}
    else if (ab.cache.memStore.hasOwnProperty(url)) {
      for (key in data)
        ab.cache.memStore[url][type][data[key]] = ""
    }
    else
      throw "url does not exist in the cache"
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
          ab.cache.set("vertex", url, data)
          result.vertexCache = ab.cache.get("vertex", url)
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
          // based on delete type, change the vertex properties
          if (data.all === true) ab.cache.remove("vertex", url)
          else ab.cache.remove("vertex", url, data.data)
          result.vertexCache = ab.cache.get("vertex", url, true)
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
          ab.cache.set("edges", url, data)
          result.edgeCache = ab.cache.get("edges", url)
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
          if (data.all === true) ab.cache.remove("edges", url)
          else ab.cache.remove("edges", url, data.data)
          result.edgeCache = ab.cache.get("edges", url)
					callback(null, result)
				}
			})
			.error(callback)
	}
} /* End of server edges */

ab.interface.ref = function(path) {
  var exports = {}

  exports.path = function() {
    return path
  }

  exports.outVertex = function(edgeName) {
    return new ab.interface.ref(path+'/'+edgeName)
  }

  exports.inVertex = function(edgeName) {
    return new ab.interface.ref(path.slice(0, path.lastIndexOf('/')))
  }

  exports.setData = function(data, callback) {
    ab.server.vertex.set(path, data, function(error) {
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
    ab.server.vertex.delete(path, {data:data, all:all}, function(error) {
      callback(error, exports)
    })
  }

  exports.setEdge = function(edgeData, callback) {
    if(edgeData.priority === undefined) {
      edgeData.priority = null
    }
    var data = {}
    data[edgeData.name] = {
      path: edgeData.ref.path(),
      order: edgeData.priority === undefined? null: edgeData.priority
    }
    ab.server.edges.set(path, data, function(error, result) {
      if(!error) {
        callback(error,exports)
      } else {
        callback(error)
      }
    })
  }
  return exports
}

Appbase.ref = function(path) {
  return ab.interface.ref(path)
}

Appbase.new = function(path, callback) {
  var intermediate = path.split(/\/\/(.+)?/)[1].split(/\.(.+)?/)[1].split(/\/(.+)?/)[1].split(/\/(.+)?/)
  var namespace = intermediate[0]
  if(intermediate[1]) {
    intermediate = intermediate[1].split(/\/(.+)?/)
    var key = intermediate[0]
    var obj_path = intermediate[1]
    if(obj_path) {
      throw "Not in `baseUrl/namespace/key` format"
    }
  } else {
    var key = ab.util.uuid()
    path = path+'/'+key
  }

  ab.server.vertex.set(path, {}, function(error) {
    if(!error) {
        callback && callback(error, Appbase.ref(path))
    } else {
        callback && callback(error)
    }
  })
}

ab.util = {
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
    intermediate = intermediate[1].split(/\/(.+)?/)
    var key = intermediate[0]
    var obj_path = intermediate[1]
    return {
      appname: appname,
      namespace: namespace,
      key: key,
      obj_path: obj_path
    }
  }
}