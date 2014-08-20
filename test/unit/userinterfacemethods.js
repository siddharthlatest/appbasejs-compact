var expect = chai.expect
var appName = 'aphrodite'
var appVersion = 1
var baseUrl = "http://aphrodite.api1.appbase.io"
Appbase.credentials(appName, "4d8d0072580912343cd74a09015cd217")

describe('interface methods', function() {
  describe.skip('appbase baseURL', function() {
    it.skip('getBaseURL should return proper URL', function() {
      expect(ab.server.getBaseURL()).to.be.equal(baseUrl)
    })
  })

  describe('appbase.create', function() {
    it("new vertex- with key- should not give an error, and ref should point to the proper path", function(done){
      var namespace = 'Materials'
      var key = 'Wood'
      var path = namespace + "/" + key
      var ref = Appbase.create(namespace, key)
      expect(ref.path()).to.be.equal(path)
      done()
    })
    it("new vertex- uuid as key- should not give an error, and ref should point to the proper path", function(done){
      var path = "Materials"
      var ref = Appbase.create(path, Appbase.uuid())
      var refPath = ref.path()
      expect(refPath.slice(0, refPath.lastIndexOf('/'))).to.be.equal(path)
      done()
    })
  })

  describe('paths', function() {
    var path = "Materials/Wood"
    var ref = Appbase.ref(path)
    it("should return  ref's path path", function() {
      expect(ref.path()).to.equal(path)
    })
    it("should return outVertex's ref", function() {
      var edgeName = 'outV'
      expect(ref.outVertex(edgeName).path()).to.equal(path+'/'+edgeName)
    })
    it("should return inVertex's ref", function() {
      var edgeName = 'outV'
      var outVRef = ref.outVertex(edgeName)
      expect(outVRef.inVertex().path()).to.equal(path)
    })
  })

  describe('vertex data', function() {
    var path = "Materials/Wood"
    var ref = Appbase.ref(path)
    it("setData should not throw an error, return the proper reference", function(done){
      var data = {"color":"brown"}
      async.waterfall([
        function(callback) {
          ref.setData(data, callback)
        }
      ], function(err, ref) {
        if(err)
          done(err)
        else {
          expect(ref.path()).to.equal(path)
          done()
        }
      })
    })
    it("removeData- some properties- should not throw an error, return the proper reference",function(done){
      var data = ["color"]
      async.waterfall([
        function(callback) {
          ref.removeData(data, callback)
        }
      ], function(err, ref) {
        if(err)
          done(err)
        else {
          expect(ref.path()).to.equal(path)
          done()
        }
      })
    })
    it("removeData- all- should not throw an error, return the proper reference", function(done) {
      async.waterfall([
        function(callback) {
          ref.removeData(true, callback)
        }
      ], function(err, ref) {
        if(err)
          done(err)
        else {
          expect(ref.path()).to.equal(path)
          done()
        }
      })
    })
  })

  describe('isValid', function() {
    it("isValid- the vertex should exist",function(done){
      Appbase.ref('Materials/Wood').isValid(function(error, bool){
        if(error)
          done(error)
        else {
          expect(bool).to.equal(true)
          done()
        }
      })
    })

    it("isValid- the vertex should not exist",function(done){
      Appbase.ref(Appbase.uuid()+ '/' + Appbase.uuid()).isValid(function(error, bool){
        if(error)
          done(error)
        else {
          expect(bool).to.equal(false)
          done()
        }
      })

    })
  })

  describe('edges', function() {
    var edgeNamespace = "Materials"
    var edgeKey = "Iron"
    var edgePath = "Materials/Iron"
    var priority = 50
    var path = "Materials/Wood"
    var ref = Appbase.ref(path)

    beforeEach(function() {
      Appbase.create(edgeNamespace, edgeKey)
    })

    it("setEdge- with an edge name, and priority- should not throw an error, return the proper reference",function(done){
      var edgeRef = Appbase.ref(edgePath)
      async.waterfall([
        function(callback) {
          ref.setEdge(edgeRef, "theNameIsRock", priority, callback)
        }
      ], function(err, ref) {
        if(err)
          done(err)
        else {
          expect(ref.path()).to.equal(path)
          done()
        }
      })
    })

    it("setEdge- with edge name and no priority (time)- should not throw an error, return the proper reference",function(done){
      var edgeRef = Appbase.ref(edgePath)
      async.waterfall([
        function(callback) {
          ref.setEdge(edgeRef, "theNameIsUndeadRokr", callback)
        }
      ], function(err, ref) {
        if(err)
          done(err)
        else {
          expect(ref.path()).to.equal(path)
          done()
        }
      })
    })

    it("removeEdge- with edge name- should not throw an error, return the proper reference",function(done){
      var edgeRef = Appbase.ref(edgePath)
      async.waterfall([
        function(callback) {
          ref.removeEdge("theNameIsRock", callback)
        }
      ], function(err, ref) {
        if(err)
          done(err)
        else {
          expect(ref.path()).to.equal(path)
          done()
        }
      })
    })
  })
})