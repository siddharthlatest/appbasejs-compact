var ab = {
	server: {},
    interface:{},
    util:{}
}

var Appbase = {};

var socket = io('http://sagar.appbase.io:80')

ab.util.uuid = function (){
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
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


ab.interface.ref = function(p){

    this._path = p;
}

ab.interface.ref.prototype.path = function(){
    return this._path;
}

ab.interface.ref.prototype.outVertex = function(edgeName){
    return new ab.interface.ref(this._path+'/'+edgeName);
}

ab.interface.ref.prototype.inVertex = function(edgeName){
    return new ab.interface.ref(this._path.slice(0,this._path.lastIndexOf('/')));
}

ab.interface.ref.prototype.setData = function(data,callback){
    var ref = this;
    ab.server.vertex.set(this._path,data,function(error){
        callback(error,ref);
    })
}

ab.interface.ref.prototype.removeData = function(data,callback){
    if(typeof data=="boolean"){
        if(data){
            var all = data;
            data = undefined;
        } else {
            throw "data can't be `false`."
        }
    }

    var ref = this;
    ab.server.vertex.delete(this._path,{data:data,all:all},function(error){
        callback(error,ref);
    })
}

Appbase.ref = function(path){
    return new ab.interface.ref(path);
}

Appbase.new = function(path,callback){

    var intermediate
    intermediate = path.split(/\/\/(.+)?/)[1].split(/\.(.+)?/)[1].split(/\/(.+)?/)[1].split(/\/(.+)?/)
    var namespace = intermediate[0]
    if(intermediate[1]){
        intermediate = intermediate[1].split(/\/(.+)?/)
        var key = intermediate[0]
        var obj_path = intermediate[1]
        if(obj_path){
            throw "Not in `baseUrl/namespace/key` format"
        }
    } else {
        var key = ab.util.uuid();
        path = path+'/'+key;
    }

    ab.server.vertex.set(path,{},function(error){
        if(!error){
            callback && callback(error,Appbase.ref(path))
        } else {
            callback && callback(error)
        }
    });

}