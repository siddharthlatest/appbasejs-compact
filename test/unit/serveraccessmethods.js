var domain = "http://aphrodite.api1.appbase.io/"
Appbase.credentials("aphrodite", "4d8d0072580912343cd74a09015cd217")

var expect = chai.expect
describe('Set methods', function() {
  describe('Vertex', function() {
    it('should insert a vertex property in the datastore', function(done) {
      var path = "Materials/Wood"
      var data = {"sacheen":"brown"}
      async.waterfall([
        function(callback) {
          ab.server.vertex.set(domain+path, data, callback)
        }
      ], function(err, result) {
        if(err) done(err)
        else {
          expect(result._id).to.be.a("string")
          expect(result.timestamp).to.be.a("number")
          done()
        }
      })
    })
    it('should insert multiple vertex properties in the datastore', function(done) {
      var path = "Materials/Wood"
      var data = {"sacheen":"brown", "density":10}
      async.waterfall([
        function(callback) {
          ab.server.vertex.set(domain+path, data, callback)
        }
      ], function(err, result) {
        if(err) done(err)
        else {
          expect(result._id).to.be.a("string")
          expect(result.timestamp).to.be.a("number")
          done()
        }
      })
    })
    it('should insert vertex at a different path in the datastore', function(done) {
      var path = "Materials/Ice"
      var data = {"sacheen":"white", "density":0.5}
      async.waterfall([
        function(callback) {
          ab.server.vertex.set(domain+path, data, callback)
        }
      ], function(err, result) {
        if(err) done(err)
        else {
          expect(result._id).to.be.a("string")
          expect(result.timestamp).to.be.a("number")
          done()
        }
      })
    })
  }) /* End of vertex suite */

  describe('Edges', function() {
    it('should insert an edge in the datastore', function(done) {
      var path = "Materials/Wood"
      var data = {"on":{"path":"Materials/Ice"}}
      async.waterfall([
        function(callback) {
          ab.server.edges.set(domain+path, data, callback)
        }
      ], function(err, result) {
        if(err) done(err)
        else {
          expect(result._id).to.be.a("string")
          expect(result.edges.on.timestamp).to.be.a("number")
          done()
        }
      })
    })
    it('should insert an edge with an order in the datastore', function(done) {
      var path = "Materials/Wood"
      var data = {"on":{"path":"Materials/Ice", "order":5.0}}
      async.waterfall([
        function(callback) {
          ab.server.edges.set(domain+path, data, callback)
        }
      ], function(err, result) {
        if(err) done(err)
        else {
          expect(result._id).to.be.a("string")
          expect(result.edges.on.timestamp).to.be.a("number")
          expect(result.edges.on.order).to.equal(5.0)
          done()
        }
      })
    })
  }) /* End of edge suite */
}) /* End of set methods */

describe("Get methods", function() {
  describe("Vertex", function() {
    this.timeout(5000)
    // beforeeach hook
    beforeEach(function(done) {
      var path = "Materials/Wood"
      ab.server.vertex.set(domain+path, {"sacheen":"brown"}, done)
    })
    it("should retrieve an existing object", function(done) {
      var path = "Materials/Wood"
      var madeChange = false
      async.waterfall([
        function(callback) {
          ab.server.vertex.listen(domain+path, {"all":false, "data":["sid", "sagar"]}, callback)
        }
      ],function(err, result) {
        if(err) {
          done(err)
        }
        else {
          expect(result.vertex._id).to.be.a("string")
          expect(result.vertex.timestamp).to.be.a("number")
          done()
        }
      })
    })
    it("should retrieve an existing object continuously", function(done) {
      var path = "Materials/Wood"
      var madeChange = false
      async.waterfall([
        function(callback) {
          ab.server.vertex.listen(domain+path, {"all": true}, callback)
        }
      ], function(err, result) {
        if (madeChange) {
          if(err) done(err)
          else {
            console.log("vertex properties retrieval")
            console.log(result.vertex)
            expect(result.vertex._id).to.be.a("string")
            expect(result.vertex.timestamp).to.be.a("number")
          }
        }
        else {
          ab.server.vertex.set(domain+path, {"foocolor":"blue"}, function(){})
          madeChange = true
          done() // done should be called only once.
        }
      })
    })
  }) /* End of vertex suite */

  describe("Edge", function() {
    this.timeout(5000)
    // beforeeach hook
    beforeEach(function(done) {
      var path = "Materials/Wood"
      var data = {"on":{"path":"Materials/Ice", "order":5.0},
                  "ride":{"path":"Materials/Iron", "order":8.0}}
      ab.server.edges.set(domain+path, data, done)
    })
    it("should retrieve edges from a vertex", function(done) {
      var path = "Materials/Wood"
      var madeChange = false
      async.waterfall([
        function(callback) {
          ab.server.edges.listen(domain+path, {"filters": {}}, callback)
        }
      ], function(err, result) {
        if (madeChange) {
          if(err) done(err)
          else {
            console.log("edge retrieval")
            console.log(result._id)
            expect(result._id).to.be.a("string")
          }
        } else {
            ab.server.edges.delete(domain+path, {"data": ["ride"]}, function(){})
            madeChange = true
            done()  // done should be called only once.
        }
      })
    })
  }) /* End of edge suite */

}) /* End of get methods */

describe("DELETE", function() {
  describe("Vertex", function() {
    beforeEach(function(done) {
      var path = "Materials/Iron"
      var data = {"bgcolor":"grey", "fgcolor":"silver", "density":100.0}
      ab.server.vertex.set(domain+path, data, function() {
        done()
      })
    })
    it("should remove specific vertex properties", function(done) {
      var path = "Materials/Iron"
      var data = ["fgcolor"]
      async.waterfall([
        function(callback) {
          ab.server.vertex.delete(domain+path, {"data":data}, callback)
        }
      ], function(err, result) {
        expect(result._id).to.be.a("string")
        expect(result.timestamp).to.be.a("number")
        expect(result.fgcolor).to.equal("")
        //expect(result.vertexCache.fgcolor).to.equal("")
        done()
      })
    })
    it("should remove all vertex properties", function(done) {
      var path = "Materials/Iron"
      async.waterfall([
        function(callback) {
          ab.server.vertex.delete(domain+path, {"all":true}, callback)
        }
      ], function(err, result) {
        expect(result._id).to.be.a("string")
        expect(result.timestamp).to.be.a("number")
        //expect(Object.keys(result.vertexCache).length).to.equal(0)
        done()
      })
    })
  }) /* End of Vertex suite */
  
  describe("Edge", function() {
    beforeEach(function(done) {
      var path = "Materials/Iron"
      var data = {"on":{"path":"Materials/Ice", "order":5.0}, 
                  "joy":{"path":"Materials/Iron", "order":4},
                  "ride":{"path":"Materials/Wood", "order":6.0}}
      ab.server.edges.set(domain+path, data, function() {
        done()
      })
    })
    it("should delete specific edges", function(done) {
      var path = "Materials/Iron"
      var data = ["joy", "ride"]
      async.waterfall([
        function(callback) {
          ab.server.edges.delete(domain+path, {"data": data}, callback)
        }
      ], function(err, result) {
        //expect(result.edgeCache.joy).to.equal("")
        //expect(result.edgeCache.ride).to.equal("")
        done()
      })
    })
    it("should delete all edges", function(done) {
      var path = "Materials/Iron"
      async.waterfall([
        function(callback) {
          ab.server.edges.delete(domain+path, {"all":true}, callback)
        }
      ], function(err, result) {
        expect(result._id).to.be.a("string")
        expect(result.timestamp).to.be.a("number")
        expect(Object.keys(result.edges).length).to.equal(0)
        //expect(Object.keys(result.edgeCache).length).to.equal(0)
        done()
      })
    })
  })
}) /* End of delete methods */