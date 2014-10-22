var isNode = (typeof window === 'undefined')
if(isNode) { //assuming nodejs
  var chai = require('chai')
  var Appbase = require('./../lib/main.js')
  var async = require('async')
}

var expect = chai.expect
var appName = 'aphrodite'
var appSecret = "4d8d0072580912343cd74a09015cd217"
var appVersion = 1
var baseUrl = (isNode? "http:" : location.protocol) + '//api.appbase.io/'+ appName +'/v2'

describe('interface methods', function() {
  describe('the REST api should work with secret, and without token', function() {
    it("shouldn't throw error", function(done) {
      Appbase.credentials(appName, appSecret)
      Appbase.ns('tweet').search({text:'hello', properties: ['msg']},function(err, array) {
        if(err)
          done(err)
        else {
          expect(array).to.have.length.above(0)
          done()
        }
      })
    })
  })
  
  !isNode && describe('auth', function() {
    var provider = 'google'
    var requestUrl = ''
      
    var checkCreds = function(creds) {
      var temp
      expect(creds).to.be.an('object')
      expect(creds.raw).to.be.an('object')
      expect(creds.credentials.appbase).to.be.an('object')
      expect(creds.credentials.appbase.expires_in).to.be.a('number')
      expect(creds.credentials.appbase.access_token).to.be.a('string')
      expect(creds.credentials.provider.access_token).to.be.a('string')
      expect(creds.credentials.provider.provider).to.equal(provider)
      expect(creds.credentials.provider.expires_in).to.be.a('number')
      expect(((temp = typeof creds.uid) === 'string') || temp === 'number').to.be.true;
      expect(creds.credentials.provider.expires_in).to.be.a('number')
    }
    
    it('authRedirect and authCallback: the page should redirect and return proper credentials and userid', function(done) {
      Appbase.credentials(appName) // removing secret from memory
      this.timeout(60000)
      
      var callback = function(error, creds, requestObj) {
        if(error) done(error)
        sessionStorage.removeItem('waitingForOauthCallback')
        checkCreds(creds)
        done()
      }
      
      if(!sessionStorage.getItem('waitingForOauthCallback')) {
        sessionStorage.setItem('waitingForOauthCallback', true)
        Appbase.authRedirect(provider, {authorize: {scope: ['openid']}}, document.location.href)
      }
      
      Appbase.authCallback(provider, callback)         
    })
    
    it('unauth: the request should fail after calling Appbase.unauth()', function(done) {
      Appbase.unauth()
      Appbase.ns('tweet').search({text:'hello', properties: ['msg']},function(err, array) {
        expect(err).to.equal("024: No app token specified")
        done()
      })
    })
    
    it('authPopup: it should open a popup and return proper credentials and userid', function(done) {
      this.timeout(60000)
      
      var callback = function(error, creds, requestObj) {
        if(error) done(error)
        checkCreds(creds)
        done()
      }
      
      Appbase.authPopup(provider, {authorize: {scope: ['openid']}}, callback)
    })
  })

  describe('Appbase.ns().search', function() {
    it('should not throw an error, and array shouldnt be empty', function(done) {
      Appbase.ns('tweet').search({text:'hello', properties: ['msg']},function(err, array) {
        if(err)
          done(err)
        else {
          expect(array).to.have.length.above(0)
          done()
        }
      })
    })
  })

  describe('Appbase.serverTime', function() {
    it('should return a number', function(done) {
      Appbase.serverTime(function(err, time) {
        if(err)
          done(err)
        else {
          expect(time).to.be.a('number')
          done()
        }
      })
    })
  })

  describe('Appbase.ns().v()', function() {
    it("Should return an appbase vertex reference", function(done){
      var namespace = 'Materials'
      var key = 'Wood'
      var path = namespace + "/" + key
      var ref = Appbase.ns(namespace).v(key)
      expect(ref.path()).to.be.equal(path)
      done()
    })
  })

  describe('paths', function() {
    var path = "Materials/Wood"
    var namespace = "Materials"
    var key = "Wood"
    var ref
    it("should return  ref's path path", function() {
      ref = Appbase.ns(namespace).v(key)
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
    var namespace = "Materials"
    var key = "Wood"
    var ref
    it("setData should not throw an error, return the proper reference", function(done){
      ref = Appbase.ns(namespace).v(key)
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
      Appbase.ns('Materials').v('Wood').isValid(function(error, bool){
        if(error)
          done(error)
        else {
          expect(bool).to.equal(true)
          done()
        }
      })
    })

    it("Should create a new vertex automatically", function(done){
      var path = "Materials"
      var ref = Appbase.ns(path).v(Appbase.uuid())
      var refPath = ref.path()
      expect(refPath.slice(0, refPath.lastIndexOf('/'))).to.be.equal(path)
      ref.isValid(function(error, bool){
        if(error)
          done(error)
        else {
          expect(bool).to.equal(true)
          done()
        }
      })
    })

    it("isValid- the vertex should not exist",function(done){
      Appbase.ns(Appbase.uuid()).v(Appbase.uuid()+'/'+Appbase.uuid()).isValid(function(error, bool){
        if(error)
          done(error)
        else {
          expect(bool).to.equal(false)
          done()
        }
      })

    })
  })

  describe('destroy', function() {
    it('should create a vertex, destroy it and isValid should turn false', function(done) {
      this.timeout(10000)
      var ref = Appbase.ns('misc').v(Appbase.uuid())
      ref.isValid(function(error, bool) {
        if(error)
          done(error)
        else {
          expect(bool).to.equal(true)
          ref.destroy(function(error) {
            if(error)
              done(error)
            else {
              ref.isValid(function(error, bool){
                if(error)
                  done(error)
                else {
                  expect(bool).to.equal(false)
                  done()
                }
              })
            }
          })
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
    var ns = "Materials"
    var key = "Wood"
    var ref

    beforeEach(function() {
      Appbase.ns(edgeNamespace).v(edgeKey)
    })

    it("setEdge- with an edge name, ref and priority- should not throw an error, return the proper reference",function(done){
      ref = Appbase.ns(ns).v(key)
      var edgeRef = Appbase.ns(edgeNamespace).v(edgeKey)
      async.waterfall([
        function(callback) {
          ref.setEdge("theNameIsRock", edgeRef, priority, callback)
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

    it("setEdge- with an edge name, and priority, no ref- should not throw an error, return vertex of 'misc' namespace",function(done){
      async.waterfall([
        function(callback) {
          ref.setEdge("theNameIsRock", priority, callback)
        }
      ], function(err, ref, edgeRef) {
        var refPath = edgeRef.path()
        if(err)
          done(err)
        else {
          expect(refPath.slice(0, refPath.lastIndexOf('/'))).to.equal('misc')
          done()
        }
      })
    })

    it("setEdge- with edge name, ref and no priority (time)- should not throw an error, return the proper reference",function(done){
      var edgeRef = Appbase.ns(edgeNamespace).v(edgeKey)
      async.waterfall([
        function(callback) {
          ref.setEdge("theNameIsUndeadRokr", edgeRef, callback)
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
      var edgeRef = Appbase.ns(edgeNamespace).v(edgeKey)
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
  
  !isNode && describe("unauth", function(){
    it('unauth: the request should fail after calling Appbase.unauth()', function(done) {
      Appbase.unauth()
      Appbase.ns('tweet').search({text:'hello', properties: ['msg']},function(err, array) {
        expect(err).to.equal("024: No app token specified")
        done()
      })
    })
  })
})