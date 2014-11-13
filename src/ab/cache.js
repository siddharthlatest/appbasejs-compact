var ab = require("./index.js");
ab.cache = {
  memStore: {},
  timestamps: {},
  newVertices: {},
  // Vertex cache methods - set, get, remove
  set: function(type, url, data) {
    if (!ab.cache.memStore.hasOwnProperty(url)) {
      ab.cache.memStore[url] = {"vertex":{}, "edges":{}}
      ab.cache.timestamps[url] = {}
    }
    for (var key in data) {
      if(type !== 'vertex' || (key !== '_id' && key !== 'timestamp' && key !== 'rootPath')) {
        ab.cache.memStore[url][type][key] = data[key]
        if(type === 'edges' && (ab.cache.timestamps[url][type] === undefined
         || ab.cache.timestamps[url][type] < data[key]['timestamp'] ))
          ab.cache.timestamps[url][type] = data[key]['timestamp']
      }
    }
    if(type === 'vertex')
      ab.cache.timestamps[url][type] = data['timestamp']
  },

  get: function(type, url, isClone) {
    var isClone = isClone === undefined ? true : isClone
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

module.exports = ab.cache;