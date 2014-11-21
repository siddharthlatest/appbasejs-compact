var ab = require("./index.js");
var config = require("./../config.js");
var amplify = require("./../amplify.js");
ab.interface = {};
if(config.isWindow) {
  var OAuth = require("./oauthio.js");
  ab.interface.auth = {
    getAuth: function() {
      var authObj = ab.auth.restoreCreds();
      if(authObj) {
        ab.server.setAppbaseToken(authObj.credentials.appbase.access_token)
        return {authObj: authObj, requestObj: ab.auth.credsToRequetObj(authObj)}; 
      }
      return null;         
    },
    callback: function() {
      var validArgs = ab.inputHandling.doIt(arguments, [{name: 'provider', type: 'provider'}, {name: 'callback', type: 'function'}]);
      if(validArgs.error) throw validArgs.error;
      OAuth.callback(validArgs.provider, ab.auth.completeAuth(validArgs.provider, validArgs.callback))
    },
    auth: function(provider, options, cb) {
      options.cache = true
      if(!options.authorize) {
        options.authorize = {}
      }
      options.authorize.response_type = "code"
      var tB;
      if((tB = typeof cb) === 'function') {
        OAuth.popup(provider, options, ab.auth.completeAuth(provider, cb))
      } else if (tB === 'string') {
        OAuth.redirect(provider, options, cb)
      } else {
        throw ("Invalid argument:" + cb.toString())
      }
    },
    authPopup: function() {
      var validArgs = ab.inputHandling.doIt(arguments, [{name: 'provider', type: 'provider'}, {name: 'options', type: 'object', optional:true, defaultVal: {}}, {name: 'callback', type: 'function'}]);
      if(validArgs.error) throw validArgs.error;
      ab.interface.auth.auth(validArgs.provider, validArgs.options, validArgs.callback);
    },
    authRedirect: function() {
      var validArgs = ab.inputHandling.doIt(arguments, [{name: 'provider', type: 'provider'}, {name: 'options', type: 'object', optional:true, defaultVal: {}}, {name: 'redirectURL', type: 'string'}]);
      if(validArgs.error) throw validArgs.error;
      ab.interface.auth.auth(validArgs.provider, validArgs.options, validArgs.redirectURL);
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
  
  exports.name = function() {
    return namespace
  }

  exports.v = function() {
    var validArgs = ab.inputHandling.doIt(arguments, [{name: 'path', type: 'vPath'}]);
    if(validArgs.error) throw validArgs.error;
    var objPath = ab.util.cutLeadingTrailingSlashes(validArgs.path);
    var path = namespace + '/' + objPath;
    if(objPath.indexOf('/') === -1) ab.interface.create(path, true);
    return ab.interface.vertex(path);
  }
  exports.search = function(query, cb) {
    ab.server.search(namespace, query, cb)
  }
  exports.on = function() {
    var validArgs = ab.inputHandling.doIt(arguments, [{name: 'event', type: 'nsEvent'}, {name: 'callback', type: 'function'}]);
    if(validArgs.error) throw validArgs.error;
    
    if(ab.server.ns.namespacesListening[exports.URL()]) {
      if(validArgs.event === "vertex_added")
        setTimeout(function() {
          ab.firing.prepareForNS('RETR', exports.URL(), {}, ab.cache.get('edges', exports.URL()), validArgs.callback)
        },0)
    }
    amplify.subscribe(validArgs.event+":"+exports.URL(), referenceID, validArgs.callback)
    if(!ab.server.ns.namespacesListening[exports.URL()]) {
      ab.server.ns.listen(exports.URL(), {"filters": {}}, function(error, request) {
        if(error) {
          if(validArgs.callback) 
            validArgs.callback(error)
          else throw error
          amplify.unsubscribe(validArgs.event+":"+exports.URL(), referenceID)
        }
      })
    }
  }

  exports.off = function(event) {
    var validArgs = ab.inputHandling.doIt(arguments, [{name: 'event', type: 'nsEvent', optional: true}]);
    if(validArgs.error) throw validArgs.error;
    
    if(validArgs.event) {
      amplify.unsubscribe(validArgs.event + ":" + exports.URL(), referenceID)
    } else {
      amplify.unsubscribe("vertex_added:" + exports.URL(), referenceID)
      amplify.unsubscribe("vertex_removed:" + exports.URL(), referenceID)
    }

    if(amplify.subscriptionCount("vertex_added:"+exports.URL()) === 0
      && amplify.subscriptionCount("vertex_removed:"+exports.URL()) === 0) {
      //Commenting out: in order to keep data live in the cache. ab.server.ns.unlisten(exports.URL())
    }
  }

  return exports
}

ab.interface.isValid = function(url, callback) {
  ab.server.vertex.get(url, function(er, result) {
    var error = (er !== null && er !== '101: Resource does not exist') ? er : null
    callback && (error ? callback(error) : callback(null, er !== '101: Resource does not exist'))
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

  var privateData = {
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
    onEdges: function(event, filters, interfaceCallback) {
      var reqData = {
        filters: filters
      }, proceed = function() {
        delete filters.onlyNew
        privateData.filterString = ab.util.generateFilterString(reqData)
        if(ab.server.edges.urlsListening[exports.URL() + privateData.filterString]) {
          if(event == "edge_added")
            setTimeout(function() {
              ab.firing.prepareForEdges('RETR', exports.URL() + privateData.filterString, {},
                ab.cache.get('edges', exports.URL() + privateData.filterString), interfaceCallback)
            },0)
        }
        amplify.subscribe(event+":"+exports.URL() + privateData.filterString, referenceID, interfaceCallback)
        if(!ab.server.edges.urlsListening[exports.URL() + privateData.filterString]) {
          ab.server.edges.listen(exports.URL(), reqData, function(error, request) {
            if(error) {
              interfaceCallback(error)
              amplify.unsubscribe(event+":"+exports.URL() + privateData.filterString, referenceID)
            }
          })
        }
      }
      
      if(filters.onlyNew) {
        ab.server.timestamp(function(error, timestamp) {
          if(error) return interfaceCallback(error)
          reqData.timestamp = timestamp
          proceed()
        })
      } else {
        proceed()
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
    return path;
  }
  
  exports.name = function() {
    return path.slice(path.lastIndexOf('/') + 1);
  }

  exports.outVertex = function() {
    var validArgs = ab.inputHandling.doIt(arguments, [{name: 'edgeName', type: 'eName'}]);
    if(validArgs.error) throw validArgs.error;
    return new ab.interface.vertex(path+'/'+validArgs.edgeName);
  }

  exports.inVertex = function() {
    if(path.split('/').length < 3) throw "This vertex has no inVertex."
    return new ab.interface.vertex(path.slice(0, path.lastIndexOf('/')))
  }

  exports.on = function() {
    var validArgs = ab.inputHandling.doIt(arguments, [{name: 'event', type: 'vEvent'}, {name: 'filters', type: 'eFilters', optional: true, defaultVal: {}}, {name: 'callback', type: 'function'}]);
    if(validArgs.error) throw validArgs.error;
    
    var checkForCreationAndGoAhead = function() {
      if(ab.cache.newVertices[path]) {
        setTimeout(checkForCreationAndGoAhead, 200)
      } else {
        if(validArgs.event == 'properties')
          privateData.onProperties(validArgs.callback)
        else privateData.onEdges(validArgs.event, validArgs.filters, validArgs.callback)
      }
    }
    checkForCreationAndGoAhead()
  }
  
  exports.once = function() {
    var validArgs = ab.inputHandling.doIt(arguments, [{name: 'event', type: 'vEventProperties'}, {name: 'filters', type: 'eFilters', optional: true, defaultVal: {}}, {name: 'callback', type: 'function'}]);
    if(validArgs.error) throw validArgs.error;
    
    //creating a duplicate ref to listen on, so that 'once' listeners don't collide with 'on' listeners.
    var dupRef = ab.interface.vertex(path);
    var newCallback = function() {
      dupRef.off(validArgs.event);
      validArgs.callback.apply(validArgs.callback, arguments);
    }
    dupRef.on(validArgs.event, newCallback);
  }

  exports.off = function() {
    var validArgs = ab.inputHandling.doIt(arguments, [{name: 'event', type: 'vEvent', optional: true}]);
    if(validArgs.error) throw validArgs.error;
    var event = validArgs.event;
    
    if(event) {
      amplify.unsubscribe(event + ":" + exports.URL(), referenceID)
      if(event === "properties" && amplify.subscriptionCount("properties:"+exports.URL()) === 0) {
        //Commenting out: in order to keep data live in the cache. 
        //ab.server.vertex.unlisten(exports.URL())
      }

      if(event !== "properties" && amplify.subscriptionCount("edge_added:"+exports.URL()+privateData.filterString) === 0
       && amplify.subscriptionCount("edge_removed:"+exports.URL()+privateData.filterString) === 0
       && amplify.subscriptionCount("edge_changed:"+exports.URL()+privateData.filterString) === 0) {
        //Commenting out: in order to keep data live in the cache.
        //ab.server.edges.unlisten(exports.URL()+privateData.filterString)
      }
    } else {
      amplify.unsubscribe("properties:" + exports.URL(), referenceID)
      amplify.unsubscribe("edge_added:" + exports.URL()+privateData.filterString, referenceID)
      amplify.unsubscribe("edge_removed:" + exports.URL()+privateData.filterString, referenceID)
      amplify.unsubscribe("edge_changed:" + exports.URL()+privateData.filterString, referenceID)

      if(amplify.subscriptionCount("properties:"+exports.URL()) === 0) {
        //Commenting out: in order to keep data live in the cache. 
        //ab.server.vertex.unlisten(exports.URL())
      }

      if(amplify.subscriptionCount("edge_added:"+exports.URL()+privateData.filterString) === 0
       && amplify.subscriptionCount("edge_removed:"+exports.URL()+privateData.filterString) === 0
       && amplify.subscriptionCount("edge_changed:"+exports.URL()+privateData.filterString) === 0) {
        //Commenting out: in order to keep data live in the cache.
        //ab.server.edges.unlisten(exports.URL()+privateData.filterString)
      }
    }
  }

  exports.isValid = function() {
    var validArgs = ab.inputHandling.doIt(arguments, [{name: 'callback', type: 'function'}]);
    if(validArgs.error) throw validArgs.error;
    
    var checkForCreationAndGoAhead = function() {
      if(ab.cache.newVertices[path]) {
        setTimeout(checkForCreationAndGoAhead,200)
      } else {
        ab.interface.isValid(exports.URL(), validArgs.callback)
      }
    }
    checkForCreationAndGoAhead()
  }

  exports.setData = function() {
    var validArgs = ab.inputHandling.doIt(arguments, [{name: 'data', type: 'object'}, {name: 'callback', type: 'function', optional: true}]);
    if(validArgs.error) throw validArgs.error;
    
    var checkForCreationAndGoAhead = function() {
      if(ab.cache.newVertices[path]) {
        setTimeout(checkForCreationAndGoAhead,200)
      } else {
        ab.server.vertex.set(exports.URL(), validArgs.data, function(error, result) {
          if(!error)
            validArgs.callback && validArgs.callback(error, exports)
          else {
            if(validArgs.callback)
              validArgs.callback(error)
            else
              throw error
          }
        })
      }
    }
    checkForCreationAndGoAhead()
  }

  exports.commitData = function() {
    var validArgs = ab.inputHandling.doIt(arguments, [{name: 'apply', type: 'function'}, {name: 'callback', type: 'function', optional: true}]);
    if(validArgs.error) throw validArgs.error;
    
    var cb = validArgs.callback;
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
            var newData = validArgs.apply(vSnap.properties())
          } catch (e) {
            if(cb)
              cb(error, exports)
            else
              throw error
          }
          if(typeof newData !== 'object') {
            if(cb)
              cb("The 'apply' function must return an oject.", exports)
            else
              throw "The 'apply' function must return an oject."
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

  exports.removeData = function() {
    var validArgs = ab.inputHandling.doIt(arguments, [{name: 'propertyName', type: 'pNameOrArray'}, {name: 'callback', type: 'function', optional: true}]);
    if(validArgs.error) throw validArgs.error;
    var data;
    if(validArgs.propertyName instanceof Array) {
      data = validArgs.propertyName
    } else {
      data = [validArgs.propertyName]
    }

    var checkForCreationAndGoAhead = function() {
      if(ab.cache.newVertices[path]) {
        setTimeout(checkForCreationAndGoAhead,200)
      } else {
        ab.server.vertex.delete(exports.URL(), {data: data}, function(error) {
          if(!error)
            validArgs.callback && validArgs.callback(error, exports)
          else {
            if(validArgs.callback)
              validArgs.callback(error)
            else
              throw error
          }
        })
      }
    }
    checkForCreationAndGoAhead()
  }

  exports.destroy = function(callback) {
    var validArgs = ab.inputHandling.doIt(arguments, [{name: 'callback', type: 'function', optional: true}]);
    if(validArgs.error) throw validArgs.error;
    
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

  exports.setEdge = function() {
    var validArgs = ab.inputHandling.doIt(arguments, [{name: 'edgeName', type: 'eName'}, {name: 'vRef', type: 'vRef', optional: true}, {name: 'priority', type: 'number', optional: true, defaultVal: null}, {name: 'callback', type: 'function', optional: true}]);
    if(validArgs.error) throw validArgs.error;

    var data = {}

    data[validArgs.edgeName] = {
      path: validArgs.vRef? validArgs.vRef.path() : (validArgs.vRef = ab.interface.create('misc/'+ ab.util.uuid())).path(),
      order: validArgs.priority
    }

    var checkForCreationAndGoAhead = function() {
      if(ab.cache.newVertices[path] || ab.cache.newVertices[validArgs.vRef.path()]) {
        setTimeout(checkForCreationAndGoAhead,200)
      } else {
        ab.server.edges.set(exports.URL(), data, function(error, result) {
          if(!error) {
            validArgs.callback && validArgs.callback(error, exports, validArgs.vRef)
          } else {
            if(validArgs.callback)
              validArgs.callback(error)
            else
              throw error
          }
        })
      }
    }
    checkForCreationAndGoAhead()
  }

  exports.removeEdge = function() {
    var validArgs = ab.inputHandling.doIt(arguments, [{name: 'edgeName', type: 'eNameOrArray'}, {name: 'callback', type: 'function', optional: true}]);
    if(validArgs.error) throw validArgs.error;
    var data;
    if(validArgs.edgeName instanceof Array) {
      data = validArgs.edgeName
    } else {
      data = [validArgs.edgeName]
    }
    
    var checkForCreationAndGoAhead = function() {
      if(ab.cache.newVertices[path]) {
        setTimeout(checkForCreationAndGoAhead, 200)
      } else {
        ab.server.edges.delete(exports.URL(), {data: data}, function(error, result) {
          if(!error) {
            validArgs.callback && validArgs.callback(error, exports)
          } else {
            if(validArgs.callback)
              validArgs.callback(error)
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