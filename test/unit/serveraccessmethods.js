var domain = "http://test.localhost:5005/"
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
    // beforeeach hook
    beforeEach(function() {
      var path = "Materials/Wood"
      ab.server.vertex.set(domain+path, {"color":"brown"}, function() {})
    })
    it("should retrieve an existing object", function(done) {
      var path = "Materials/Wood"
      async.waterfall([
        function(callback) {
          ab.server.vertex.get(domain+path, callback)
        }
      ], function(err, result) {
        if(err) done(err)
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
          ab.server.vertex.listen(domain+path, null, callback)
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
          ab.server.edges.get(domain+path, data, null, callback)
        }
      ], function(err, result) {
        if (madeChange) {
          if(err) done(err)
          else {
            console.log(result);
            expect(result._id).to.be.a("string")
            expect(result.edges.on.order).to.equal(5.0)
            expect(result.edges.on.t_id).to.be.a("string")
            expect(result.edges.on.timestamp).to.be.a("number")
            done()
          }
        } else {
          console.log(result)
          setTimeout(3000,ab.server.edges.set(domain+path, data, function(){}));
          madeChange = true
        }
      })
    })
  }) /* End of edge suite */

}) /* End of get methods */