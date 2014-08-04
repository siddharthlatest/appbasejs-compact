var domain = "http://app.sagar.appbase.io/"
var expect = chai.expect
describe('Set methods', function() {
  describe('Vertex', function() {
    it('should insert a vertex property in the datastore', function(done) {
      var path = "Materials/Wood"
      var data = {"color":"brown"}
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
      var data = {"color":"brown", "density":10}
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
      var data = {"color":"white", "density":0.5}
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
    beforeEach(function() {
      var path = "Materials/Wood"
      ab.server.vertex.set(domain+path, {"color":"brown"}, function() {})
    })
    it("should retrieve an existing object", function(done) {
      var path = "Materials/Wood"
      var madeChange = false
      async.waterfall([
        function(callback) {
          ab.server.vertex.listen(domain+path, {"all": false, "data":["color"]}, callback)
        }
      ],function(err, result) {
        if(err) {
          done(err)
        }
        else {
          expect(result.vertex._id).to.be.a("string")
          expect(result.vertex.timestamp).to.be.a("number")
          expect(result.vertex.color).to.equal("brown")
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
            expect(result.vertex._id).to.be.a("string")
            expect(result.vertex.timestamp).to.be.a("number")
            expect(result.vertex.foocolor).to.equal("blue")
            done()
          }
        }
        else {
          ab.server.vertex.set(domain+path, {"foocolor":"blue"}, function(){})
          madeChange = true
        }
      })
    })
  }) /* End of vertex suite */

  describe("Edge", function() {
    // beforeeach hook
    beforeEach(function() {
      var path = "Materials/Wood"
      var data = {"on":{"path":"Materials/Ice", "order":5.0}}
      ab.server.edges.set(domain+path, data, function() {})
    })
    it("should retrieve edges from a vertex", function(done) {
      var path = "Materials/Wood"
      var data = {"startAt":0}
      var madeChange = false
      async.waterfall([
        function(callback) {
          ab.server.edges.listen(domain+path, {"filters": {}}, callback)
        }
      ], function(err, result) {
        if (madeChange) {
          if(err) done(err)
          else {
            expect(result._id).to.be.a("string")
            done()
          }
        } else {
            ab.server.edges.set(domain+path, {"ride":{"path":"Materials/Wood"}}, function(){})
            madeChange = true
        }
      })
    })
  }) /* End of edge suite */

}) /* End of get methods */

describe("DELETE", function() {
  describe("Vertex", function() {
    beforeEach(function() {
      var path = "Materials/Iron"
      var data = {"bgcolor":"grey", "fgcolor":"silver", "density":100.0}
      ab.server.vertex.set(domain+path, data, function() {})
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
        expect(Object.keys(result).length).to.equal(2)
        done()
      })
    })
  }) /* End of Vertex suite */
  
  describe("Edge", function() {
    beforeEach(function() {
      var path = "Materials/Iron"
      var data = {"on":{"path":"Materials/Ice", "order":5.0}, 
                  "joy":{"path":"Materials/Iron", "order":4},
                  "ride":{"path":"Materials/Wood", "order":6.0}}
      ab.server.edges.set(domain+path, data, function() {})
    })
    it("should delete specific edges", function(done) {
      var path = "Materials/Iron"
      var data = ["joy", "ride"]
      async.waterfall([
        function(callback) {
          ab.server.edges.delete(domain+path, {"data": data}, callback)
        }
      ], function(err, result) {
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
        done()
      })
    })
  })
}) /* End of delete methods */