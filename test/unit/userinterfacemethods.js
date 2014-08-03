it.skip('should not allow having null as a vertex property value', function(done) {
  var path = "Materials/Wood/~properties"
  var data = {"val":null}
  async.waterfall([
    function(callback) {
      ab.server.vertex.set(domain+path, data, callback)
    }
  ], function(err, result) {
    if(err) {
      expect(err.message).to.equal("invalid datatype for key val")
      done()
    } else {
      done(new Error('unable to catch invalid datatype'))
    }
  })
})