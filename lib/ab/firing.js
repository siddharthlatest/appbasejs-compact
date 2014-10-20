var ab = require("./index.js");
var amplify = require("./../amplify.js");

ab.firing = {
  prepareForProperties: function(optype, url, previous, current, callback) {
    ab.firing.fireForProperties(url, previous, current, callback)
  },
  prepareForEdges: function(optype, url, previous, current, callback) {
    switch(optype) {
      case "REMOVE ALL":
        for(var edgeName in previous) {
          ab.firing.fireForEdges(url, "edge_removed", previous[edgeName], {},
           edgeName, callback)
        }
        break
      case "REMOVE":
        for(var edgeName in current) {
          if(previous[edgeName] !== undefined)
            ab.firing.fireForEdges(url, "edge_removed", previous[edgeName], {},
             edgeName, callback)
        }
        break
      default :
        for(var edgeName in current) {
          if(previous[edgeName] !== undefined)
            ab.firing.fireForEdges(url, "edge_changed",
             previous[edgeName], current[edgeName], edgeName, callback)
          else
            ab.firing.fireForEdges(url, "edge_added", {}, current[edgeName],
             edgeName, callback)
        }
    }
  },
  prepareForNS: function(optype, url, previous, current, callback) {
    switch(optype) {
      case "DESTROY":
        for(var pKey in current) {
          if(previous[pKey] !== undefined)
            ab.firing.fireForNS(url, "vertex_destroyed", previous[pKey], callback)
        }
        break
      default :
        for(var pKey in current) {
          if(previous[pKey] === undefined)
            ab.firing.fireForNS(url, "vertex_added", current[pKey], callback)
        }
    }
  },
  fireForNS: function(url, event, v, callback) {
    if(typeof callback == 'function') {
      callback(null, ab.interface.vertex(v.rootPath))
    } else {
      amplify.publish(event+':'+url, null, ab.interface.vertex(v.rootPath))
    }
  },
  fireForProperties: function(url, previous, current, callback) {
    var vertexSnapshot = ab.util.createVertexSnapshot(previous, current)
    if(typeof callback == 'function') {
      callback(null, ab.interface.vertex(ab.util.URLToPath(url)), vertexSnapshot)
    } else {
      amplify.publish('properties:'+url, null, ab.interface.vertex(ab.util.URLToPath(url)),
       vertexSnapshot)
    }
  },
  fireForEdges: function(url, event, previous, current, edgeName, callback) {
    var edgeSnapshot = ab.util.createEdgeSnapshot(previous, current, edgeName)
    if(typeof callback == 'function') {
      callback(null, ab.interface.vertex(ab.util.URLToPath(url)+'/'+edgeName), edgeSnapshot)
    } else {
      amplify.publish(event+':'+url, null, ab.interface.vertex(ab.util.URLToPath(url)
       +'/'+edgeName), edgeSnapshot)
    }
  }
}

module.exports = ab.firing;
