var ab = {
	server: {}
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
	get: function(url, callback) {
		atomic.post(url + "/~properties", {"all":true})
			.success(function(result) {
				if(typeof result === 'string') {
					callback(new Error(result))
				} else {
					callback(null, result)
				}
			})
			.error(callback)
	},
	listen: function(url, timestamp, callback) {
		atomic.post(url + "/~properties", {"all":true, "timestamp":timestamp})
			.success(function(result) {
				if(typeof result === 'string') {
					callback(new Error(result))
				} else {
					timestamp = result.vertex.timestamp
					ab.server.vertex.listen(url, timestamp, callback)
					callback(null, result)
				}
			})
			.error(callback)
	}
}

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
	get: function(url, data, timestamp, callback) {
		atomic.post(url + "/~edges", {"filters":data, "timestamp":timestamp})
			.success(function(result) {
				if(typeof result === 'string') {
					callback(new Error(result))
				} else {
					delete data.skip
					delete data.limit
					timestamp = -Infinity
					for (key in result.edges) {
						if(result.edges.hasOwnProperty(key))
							timestamp = Math.max(timestamp,result.edges[key].timestamp)
					}
					console.log(timestamp)
					ab.server.edges.get(url, data, timestamp, callback)
					callback(null, result)
				}
			})
			.error(callback)
	}
}