var ab = require("./index.js");
var config = require("./../config.js");
var amplify = require("./../amplify.js");
ab.interface = {};
if(config.isWindow) {
  var OAuth = require("./oauthio.js");
  ab.interface.auth = {
    completeAuth: function(provider, cb) {
      return function(error, providerResponse) {
        if(error) {
          ab.auth.unauth();
          cb(error)
          return
        }
        var savedCreds = ab.auth.restoreCreds()
        //TODO: check for code, provider
        if(savedCreds && (Date.now()/1000 < ((savedCreds.credentials.appbase.expires_in) + savedCreds.credentials.appbase.generated_at))) {
          ab.server.setAppbaseToken(savedCreds.credentials.appbase.access_token)
          cb(null, savedCreds, ab.auth.credsToRequetObj(savedCreds))
        } else {
          ab.auth.saveCreds(null)
          ab.auth.codeToCreds(provider, providerResponse.code, function(error, creds) {
            if(error) {
              ab.auth.unauth();
              return cb(error)
            }
            creds.credentials.appbase.generated_at = (Date.now()/1000) - 2 //assuming network latency 2 secs
            creds.credentials.provider.generated_at = creds.credentials.appbase.generated_at
            ab.auth.saveCreds(creds)
            ab.server.setAppbaseToken(creds.credentials.appbase.access_token)
            cb(null, creds, ab.auth.credsToRequetObj(creds))
          })
        }
      }
    },
    callback: function(provider, cb) {
      OAuth.callback(provider, ab.interface.auth.completeAuth(provider, cb))
    },
    auth: function(provider, options, cb) {
      if((typeof options) !== 'object') {
        var cb = options
        options = {}
      }
      options.cache = true
      var tB;
      if((tB = typeof cb) === 'function') {
        OAuth.popup(provider, options, ab.interface.auth.completeAuth(provider, cb))
      } else if (tB === 'string') {
        OAuth.redirect(provider, options, cb)
      } else {
        throw ("Invalid argument:" + cb.toString())
      }
    },
    unauth: function() {
      ab.auth.unauth();
    }
  }
}

ab.interface.ns = function(namespace) {
  var referenceID = ab.util.uuid()

  var exports = {
    isNS: true
  }

  exports.type = function() {
    return 'namespace'
  }

  exports.URL = function() {
    return ab.util.pathToURL(namespace)
  }

  exports.path = function() {
    return namespace
  }

  exports.v = function(vPath) {
    var path = namespace + '/' + ab.util.cutLeadingTrailingSlashes(vPath)
    ab.interface.create(path, true)
    return ab.interface.vertex(path)
  }
  exports.search = function(query, cb) {
    ab.server.search(namespace, query, cb)
  }
  exports.on = function(event, interfaceCallback) {
    if(ab.server.ns.namespacesListening[exports.URL()]) {
      if(event === "vertex_added")
        setTimeout(function() {
          ab.firing.prepareForNS('RETR', exports.URL(), {}, ab.cache.get('edges', exports.URL()), interfaceCallback)
        },0)
    }
    amplify.subscribe(event+":"+exports.URL(), referenceID, interfaceCallback)
    if(!ab.server.ns.namespacesListening[exports.URL()]) {
      ab.server.ns.listen(exports.URL(), {"filters": {}}, function(error, request) {
        if(error) {
          interfaceCallback(error)
          amplify.unsubscribe(event+":"+exports.URL(), referenceID)
        }
      })
    }
  }

  exports.off = function(event) {
    if(event) {
      amplify.unsubscribe(event + ":" + exports.URL(), referenceID)
    } else {
      amplify.unsubscribe("vertex_added:" + exports.URL(), referenceID)
      amplify.unsubscribe("vertex_destroyed:" + exports.URL(), referenceID)
    }

    if(amplify.subscriptionCount("vertex_added:"+exports.URL()) === 0
      && amplify.subscriptionCount("vertex_destroyed:"+exports.URL()) === 0) {
      //Commenting out: in order to keep data live in the cache. ab.server.ns.unlisten(exports.URL())
    }
  }

  return exports
}

ab.interface.isValid = function(url, callback) {
  ab.server.vertex.get(url, function(error, result) {
    callback && callback(error !== null && error !== '101: Resource does not exist'? error : null, !(error && error === '101: Resource does not exist'))
  })
}

ab.interface.create = function(path, onlyIfInvalid) {
  if(!path) {
    throw 'Invalid arguments'
  }

  path = ab.util.cutLeadingTrailingSlashes(path)
  var vRef = ab.interface.vertex(path)
  ab.cache.newVertices[path] = true
  var proceed = function () {
    ab.server.vertex.set(ab.util.pathToURL(path), {}, function(error, result) {
      delete ab.cache.newVertices[path]
    })
  }

  if(onlyIfInvalid) {
    ab.interface.isValid(vRef.URL(), function(error, bool) {
      if(bool) {
        delete ab.cache.newVertices[path]
      } else {
        proceed()
      }
    })
  } else {
    proceed()
  }

  return vRef
}

ab.interface.vertex = function(path) {
  var referenceID = ab.util.uuid()

  var internalFunctions = {
    onProperties: function(interfaceCallback) {
      if(ab.server.vertex.urlsListening[exports.URL()]) {
        if(ab.cache.timestamps[exports.URL()] && ab.cache.timestamps[exports.URL()]['vertex']) { //fire only the timestamp exists- the data is arrived from server
          setTimeout(function() {
            ab.firing.prepareForProperties('RETR', exports.URL(), {},
              ab.cache.get('vertex', exports.URL()), interfaceCallback)
          },0)
        }
      }
      amplify.subscribe("properties:"+exports.URL(), referenceID, interfaceCallback)
      if(!ab.server.vertex.urlsListening[exports.URL()]) {
        ab.server.vertex.listen(exports.URL(), {all:true}, function(error, request) {
          if(error) {
            interfaceCallback(error)
            amplify.unsubscribe("properties:"+exports.URL(), referenceID)
            if(amplify.subscriptionCount("properties:"+exports.URL()) === 0){
              ab.server.vertex.unlisten(exports.URL())
            }
          }
        })
      }
    },
    onEdges: function(event, interfaceCallback) {
      if(ab.server.edges.urlsListening[exports.URL()]) {
        if(event == "edge_added")
          setTimeout(function() {
            ab.firing.prepareForEdges('RETR', exports.URL(), {},
              ab.cache.get('edges', exports.URL()), interfaceCallback)
          },0)
      }
      amplify.subscribe(event+":"+exports.URL(), referenceID, interfaceCallback)
      if(!ab.server.edges.urlsListening[exports.URL()]) {
        ab.server.edges.listen(exports.URL(), {"filters": {}}, function(error, request) {
          if(error) {
            interfaceCallback(error)
            amplify.unsubscribe(event+":"+exports.URL(), referenceID)
          }
        })
      }
    }
  }

  var exports = {
    isV: true
  }

  exports.type = function() {
    return 'vertex'
  }

  exports.URL = function() {
    return ab.util.pathToURL(path)
  }

  exports.path = function() {
    return path
  }

  exports.outVertex = function(edgeName) {
    return new ab.interface.vertex(path+'/'+edgeName)
  }

  exports.inVertex = function() {
    return new ab.interface.vertex(path.slice(0, path.lastIndexOf('/')))
  }

  exports.on = function(event, callback) {
    if(!(typeof event === "string" && typeof callback === "function"))
      throw  "Invalid arguments."

    var checkForCreationAndGoAhead = function() {
      if(ab.cache.newVertices[path]) {
        setTimeout(checkForCreationAndGoAhead,200)
      } else {
        if(event == 'properties')
          internalFunctions.onProperties(callback)
        else internalFunctions.onEdges(event, callback)
      }
    }
    checkForCreationAndGoAhead()
  }

  exports.off = function(event) {
    if(event) {
      amplify.unsubscribe(event + ":" + exports.URL(), referenceID)
      if(event === "properties" && amplify.subscriptionCount("properties:"+exports.URL()) === 0) {
        //Commenting out: in order to keep data live in the cache. ab.server.vertex.unlisten(exports.URL())
      }

      if(event !== "properties" && amplify.subscriptionCount("edge_added:"+exports.URL()) === 0
       && amplify.subscriptionCount("edge_removed:"+exports.URL()) === 0
       && amplify.subscriptionCount("edge_changed:"+exports.URL()) === 0) {
        //Commenting out: in order to keep data live in the cache. ab.server.edges.unlisten(exports.URL())
      }
    } else {
      amplify.unsubscribe("properties:" + exports.URL(), referenceID)
      amplify.unsubscribe("edge_added:" + exports.URL(), referenceID)
      amplify.unsubscribe("edge_removed:" + exports.URL(), referenceID)
      amplify.unsubscribe("edge_changed:" + exports.URL(), referenceID)

      if(amplify.subscriptionCount("properties:"+exports.URL()) === 0) {
        //Commenting out: in order to keep data live in the cache. ab.server.vertex.unlisten(exports.URL())
      }

      if(amplify.subscriptionCount("edge_added:"+exports.URL()) === 0
       && amplify.subscriptionCount("edge_removed:"+exports.URL()) === 0
       && amplify.subscriptionCount("edge_changed:"+exports.URL()) === 0) {
        //Commenting out: in order to keep data live in the cache. ab.server.edges.unlisten(exports.URL())
      }
    }
  }

  exports.isValid = function(callback) {
    var checkForCreationAndGoAhead = function() {
      if(ab.cache.newVertices[path]) {
        setTimeout(checkForCreationAndGoAhead,200)
      } else {
        ab.interface.isValid(exports.URL(), callback)
      }
    }
    checkForCreationAndGoAhead()
  }

  exports.setData = function(data, callback) {
    var checkForCreationAndGoAhead = function() {
      if(ab.cache.newVertices[path]) {
        setTimeout(checkForCreationAndGoAhead,200)
      } else {
        ab.server.vertex.set(exports.URL(), data, function(error, result) {
          if(!error)
            callback && callback(error, exports)
          else {
            if(callback)
              callback(error)
            else
              throw error
          }
        })
      }
    }
    checkForCreationAndGoAhead()
  }

  exports.commitData = function(apply, cb) {
    var commit = function(attempt) {
      var listenerFired;
      var dupRef = ab.interface.vertex(path)
      dupRef.on('properties', function(error, ref, vSnap) {
        dupRef.off()
        if(listenerFired)
          return
        listenerFired = true
        if(error) {
          cb && cb(error, exports)
        } else {
          try {
            var newData = apply(vSnap.properties())
          } catch (e) {
            if(cb)
              cb(error, exports)
            else
              throw error
          }
          if(typeof newData !== 'object') {
            if(cb)
              cb("The function must return an oject.", exports)
            else
              throw "The function must return an oject."
          } else {
            ab.server.vertex.set(exports.URL(), newData, function(error, result) {
              if(!error){
                cb && cb(error, exports)
              }
              else {
                if(error.toString() === '301: Unable to update') { //means the server timestamp didn't match with the one sent
                  commit(attempt+1)
                } else {
                  if(cb)
                    cb(error, exports)
                  else
                    throw error
                }
              }
            }, ab.cache.timestamps[exports.URL()]['vertex'])
          }
        }
      })
    }
    commit(1)
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
          if(!error)
            callback && callback(error, exports)
          else {
            if(callback)
              callback(error)
            else
              throw error
          }
        })
      }
    }
    checkForCreationAndGoAhead()
  }

  exports.destroy = function(callback) {
    var checkForCreationAndGoAhead = function() {
      if(ab.cache.newVertices[path]) {
        setTimeout(checkForCreationAndGoAhead,200)
      } else {
        ab.server.vertex.destroy(exports.URL(), function(error, result) {
          if(!error)
            callback && callback(error, exports)
          else {
            if(callback)
              callback(error)
            else
              throw error
          }
        })
      }
    }
    checkForCreationAndGoAhead()
  }

  exports.setEdge = function(name, ref, priority, callback) {
    //dealing with optional arguments
    if(arguments.length === 2) {
      if(typeof ref === 'number') {
        var priority = ref
        ref = undefined
      } else if (typeof ref === 'function') {
        var callback = ref
        ref = undefined
      } else if(!(ref.isV)) {
        throw "Invalid Arguments for setEdge."
      }
    } else if(arguments.length === 3) {
      if(typeof ref === 'number' && typeof priority === 'function') {
        var callback = priority
        var priority  = ref
        ref = undefined
      } else if (typeof ref.path === 'function' && typeof priority === 'function') {
        var callback = priority
        priority = undefined
      } else if(!(ref.isV && typeof priority === 'number')) {
        throw "Invalid Arguments for setEdge."
      }
    } else if(!(arguments.length === 4 && typeof ref.path === 'function' && typeof priority === 'number' && typeof callback === 'function')) {
      throw "Invalid Arguments for setEdge."
    }

    var data = {}

    var ref = ref

    data[name] = {
      path: ref? ref.path() : (ref = ab.interface.create('misc/'+ ab.util.uuid())).path(),
      order: priority === undefined? null:priority
    }

    var checkForCreationAndGoAhead = function() {
      if(ab.cache.newVertices[path] || ab.cache.newVertices[ref.path()]) {
        setTimeout(checkForCreationAndGoAhead,200)
      } else {
        ab.server.edges.set(exports.URL(), data, function(error, result) {
          if(!error) {
            callback && callback(error, exports, ref)
          } else {
            if(callback)
              callback(error)
            else
              throw error
          }
        })
      }
    }
    checkForCreationAndGoAhead()
  }

  exports.removeEdge = function(edgeName, callback) {
    var checkForCreationAndGoAhead = function() {
      if(ab.cache.newVertices[path]) {
        setTimeout(checkForCreationAndGoAhead, 200)
      } else {
        ab.server.edges.delete(exports.URL(), {data:[edgeName]}, function(error, result) {
          if(!error) {
            callback && callback(error, exports)
          } else {
            if(callback)
              callback(error)
            else
              throw error
          }
        })
      }
    }
    checkForCreationAndGoAhead()
  }
  return exports
}

module.exports = ab.interface;