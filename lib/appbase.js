var ab = {
	server: {}
}
var socket = io('http://sagar.appbase.io:80')

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
		var intermediate
		intermediate = url.split(/\/\/(.+)?/)[1].split(/\.(.+)?/)
		var appname = intermediate[0]
		intermediate = intermediate[1].split(/\/(.+)?/)[1].split(/\/(.+)?/)
		var namespace = intermediate[0]
		intermediate = intermediate[1].split(/\/(.+)?/)
		var key = intermediate[0]
		var obj_path = intermediate[1]
		var data = {
			appname: appname,
			namespace: namespace,
			key: key,
			obj_path: obj_path,
			all: requestdata.all,
			data: requestdata.data
		}
        
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
		var intermediate
		intermediate = url.split(/\/\/(.+)?/)[1].split(/\.(.+)?/)
		var appname = intermediate[0]
		intermediate = intermediate[1].split(/\/(.+)?/)[1].split(/\/(.+)?/)
		var namespace = intermediate[0]
		intermediate = intermediate[1].split(/\/(.+)?/)
		var key = intermediate[0]
		var obj_path = intermediate[1]
		var data = {
			appname: appname,
			namespace: namespace,
			key: key,
			obj_path: obj_path,
			filters: requestdata.filters
		}
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
					callback(null, result)
				}
			})
			.error(callback)
	}
} /* End of server edges */