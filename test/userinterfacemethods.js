var isNode = (typeof window === 'undefined')
if(isNode) { //assuming nodejs
  var chai = require('chai')
  var Appbase = require('./../src/main.js')
  var async = require('async')
}

var expect = chai.expect
var appName = 'aphrodite'
var appSecret = "4d8d0072580912343cd74a09015cd217"
var appVersion = 1
var baseUrl = (isNode? "http:" : location.protocol) + '//api.appbase.io/'+ appName +'/v2'

describe('interface methods', function() {
  describe('credentials', function() {
    it('should fail with wrong credentials', function(done) {
      Appbase.credentials(appName, 'randomshit', function(error, valid) {
        if(error) done(error);
        expect(valid).to.not.be.ok;
        done();
      })
    })
    
    it('should work with right credentials', function(done) {
      Appbase.credentials(appName, appSecret, function(error, valid) {
        if(error) done(error);
        expect(valid).to.be.ok;
        done();
      })
    })
  })
  
  describe('the REST api should work with secret, and without token', function() {
    it("shouldn't throw error", function(done) {
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
        
    it('getAuth: after authRedirect, it should return proper credentials and userid', function() {
      var auth = Appbase.getAuth();
      expect(auth).to.not.be.null;
      auth && checkCreds(auth.authObj);
    })
    
    it('unauth: after authRedirect, the request should fail after calling Appbase.unauth()', function(done) {
      Appbase.unauth()
      Appbase.ns('tweet').search({text:'hello', properties: ['msg']},function(err, array) {
        expect(err).to.equal("024: No app token specified")
        done()
      })
      expect(Appbase.getAuth()).to.be.null;
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
    
    it('getAuth: after authPopup, it should return proper credentials and userid', function() {
      var auth = Appbase.getAuth();
      expect(auth).to.not.be.null;
      auth && checkCreds(auth.authObj);
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
    var namespace = "Materials";
    var key = "Wood";
    var path = namespace + '/' + key;
    var nsRef = Appbase.ns(namespace);
    var ref;
    it("should return ref's path", function() {
      ref = nsRef.v(key);
      expect(ref.path()).to.equal(path);
    })
    it("should return name of the vertex/namespace", function() {
      expect(ref.name()).to.equal(key);
      expect(nsRef.name()).to.equal(namespace);
    })
    it("should return outVertex's ref", function() {
      var edgeName = 'outV';
      expect(ref.outVertex(edgeName).path()).to.equal(path+'/'+edgeName);
    })
    it("should return inVertex's ref", function() {
      var edgeName = 'outV';
      var outVRef = ref.outVertex(edgeName);
      expect(outVRef.inVertex().path()).to.equal(path);
    })
  })

  describe('vertex data', function() {
    var path = "Materials/Wood"
    var namespace = "Materials"
    var key = "Wood"
    var ref
    it("setData should not throw an error, return the proper reference", function(done){
      ref = Appbase.ns(namespace).v(key)
      var data = {"color":"brown", "abc": "pqr", "asd": "lsd"}
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
    it("removeData- one property- should not throw an error, return the proper reference",function(done){
      async.waterfall([
        function(callback) {
          ref.removeData("color", callback)
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
    it("removeData- multiple properties- should not throw an error, return the proper reference", function(done) {
      async.waterfall([
        function(callback) {
          ref.removeData(['abc', 'asd'], callback)
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
    
    it("once: should fire properties only once", function(done) {
      async.waterfall([
        function(callback) {
          var fired;
          ref.once('properties', function(error, vRef, vSnap) {
            if(error) throw callback(error);
            if(fired) {
              done("Fired more than once");
            } else {
              fired = true;
              setTimeout(done, 2000); //wait for 2 secs to be fired again
            }
            callback();
             
          })
        }, 
        function(callback) {
          //changing the proerties and see if it fires
          ref.setData({"lol": "lala"}, callback);
        }
      ], function(error) {
        if(error) done(error);
      });
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
    
    it("removeEdge- with array - should not throw an error, return the proper reference",function(done){
      var edgeRef = Appbase.ns(edgeNamespace).v(edgeKey)
      async.waterfall([
        function(callback) {
          ref.removeEdge(["theNameIsUndeadRokr"], callback)
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
  
  describe("Listen: edges with filters", function() {
    var appName = 'aphrodite'
    var appSecret = "4d8d0072580912343cd74a09015cd217"
    Appbase.credentials(appName, appSecret)
    var refs = [];
    it("edges: without filters: should get existing edges as well", function(done) {
      this.timeout(20000);
      var ref = Appbase.ns('misc').v(Appbase.uuid());
      refs[0] = ref;
      var edges = [];
      var noEdges = 5;
      async.whilst(function() { return edges.length < 3;}, 
        function(callback) {
          var edgeName = Appbase.uuid();
          edges.push(edgeName);
          ref.setEdge(edgeName, callback);
        }
      , function(error) {
          if(error) return done(error);
          ref.on('edge_added', function(error, edgeRef, edgeSnap) {
            var i;
            if((i = edges.indexOf(edgeSnap.name())) > -1) {
              edges.splice(i, 1);
              noEdges -= 1;
              if(noEdges === 0) {
                done();
              }
            } else {
              done('wrong edges are returning.');
            }
          });
        
          //after started to listen, add 2 more edges
          var counter = noEdges;
          setTimeout( 
            async.whilst(function() { return counter;}, 
              function(callback) {
                counter -= 1;
                var edgeName = Appbase.uuid();
                edges.push(edgeName);
                ref.setEdge(edgeName, callback);
              },
              function(error) {
                if(error) return done(error);
              }
            )
          ,1000);
      })
    })
    
    it("edges: with filters: onlyTrue: should get only new edges", function(done) {
      this.timeout(20000);
      var ref = Appbase.ns('misc').v(Appbase.uuid());
      refs[1] = ref;
      var edges = [];
      var noEdges = 5;
      async.whilst(function() { return noEdges > 2;}, 
        function(callback) {
          noEdges -= 1;
          var edgeName = Appbase.uuid();
          ref.setEdge(edgeName, callback);
        }
      , function(error) {
          if(error) return done(error);
          ref.on('edge_added', { onlyNew: true } ,function(error, edgeRef, edgeSnap) {
            var i;
            if((i = edges.indexOf(edgeSnap.name())) > -1) {
              edges.splice(i, 1);
              noEdges -= 1;
              if(noEdges === 0) {
                done();
              }
            } else {
              done('wrong edges are returning.');
            }
          });
        
          //after started to listen, add 2 more edges - only these edges should be fired
          var counter = noEdges;
          setTimeout( 
            async.whilst(function() { return counter;}, 
              function(callback) {
                counter -= 1;
                var edgeName = Appbase.uuid();
                edges.push(edgeName);
                ref.setEdge(edgeName, callback);
              },
              function(error) {
                if(error) return done(error);
              }
            )
          ,1000);
      })
    })
    
    it("edges: with filters: startAt: should only get edges with certain priorities", function(done) {
      this.timeout(20000);
      var ref = Appbase.ns('misc').v(Appbase.uuid());
      refs[2] = ref;
      var edges = [];
      var startAt = 3;
      var noEdges = 5;
      async.whilst(function() { return noEdges;}, 
        function(callback) {
          var edgeName = Appbase.uuid();
          if(noEdges >= startAt) {
            edges.push(edgeName);
          }
          ref.setEdge(edgeName, noEdges, callback); // noEdges is the priority. so, 5 edges will be added here form priority 1 to 5
          noEdges -= 1;
        }
      , function(error) {
          if(error) return done(error);
          ref.on('edge_added', { startAt: startAt } ,function(error, edgeRef, edgeSnap) {
            var i;
            if((i = edges.indexOf(edgeSnap.name())) > -1) {
              edges.splice(i, 1);
              if(!edges.length) {
                done();
              }
            } else {
              done('wrong edges are returning.');
            }
          });
      })
    })
    
    it("edges: with filters: endAt: should only get edges with certain priorities", function(done) {
      this.timeout(20000);
      var ref = Appbase.ns('misc').v(Appbase.uuid());
      refs[2] = ref;
      var edges = [];
      var endAt = 3;
      var noEdges = 5;
      async.whilst(function() { return noEdges;}, 
        function(callback) {
          var edgeName = Appbase.uuid();
          if(noEdges <= endAt) {
            edges.push(edgeName);
          }
          ref.setEdge(edgeName, noEdges, callback); // noEdges is the priority. so, 5 edges will be added here form priority 1 to 5
          noEdges -= 1;
        }
      , function(error) {
          if(error) return done(error);
          ref.on('edge_added', { endAt: endAt } ,function(error, edgeRef, edgeSnap) {
            var i;
            if((i = edges.indexOf(edgeSnap.name())) > -1) {
              edges.splice(i, 1);
              if(!edges.length) {
                done();
              }
            } else {
              done('wrong edges are returning.');
            }
          });
      })
    })
    
    it("edges: with filters: limit: should only get limited no. of edges", function(done) {
      this.timeout(20000);
      var ref = Appbase.ns('misc').v(Appbase.uuid());
      refs[2] = ref;
      var limit = 3;
      var noEdges = 5;
      async.whilst(function() { return noEdges;}, 
        function(callback) {
          var edgeName = Appbase.uuid();
          ref.setEdge(edgeName, callback); // noEdges is the priority. so, 5 edges will be added here form priority 1 to 5
          noEdges -= 1;
        }
      , function(error) {
          if(error) return done(error);
          var i = 0;
          ref.on('edge_added', { limit: limit } ,function(error, edgeRef, edgeSnap) {
            i+=1;
            console.log(i);
            if(i <= limit) {
              if(i === limit) {
                //wait for a 2 secs for any other edges to fire and then call done
                setTimeout(done, 2000);
              }
              
            } else {
              done('more edges are returned than expected');
            }
          });
      })
    })
    
    it.skip("edges: with filters: skip: should skip certain edges", function(done) {
      this.timeout(20000);
      var ref = Appbase.ns('misc').v(Appbase.uuid());
      refs[2] = ref;
      var edges = [];
      var skip = 3;
      var noEdges = 5;
      var j = 0;
      async.whilst(function() { return (noEdges - j);}, 
        function(callback) {
          j += 1;
          var edgeName = Appbase.uuid();
          if( j > skip) {
            edges.push(edgeName);
          }
          ref.setEdge(edgeName, 0, callback);
        }
      , function(error) {
          if(error) return done(error);
          ref.on('edge_added', { startAt: 0, skip: skip } ,function(error, edgeRef, edgeSnap) {
            var i;
            if((i = edges.indexOf(edgeSnap.name())) > -1) {
              edges.splice(i, 1);
              if(!edges.length) {
                done();
              }
            } else {
              done('wrong edges are returning.');
            }
          });
      })
    })
    
  })
  
  
  
  !isNode && describe("unauth", function(){
    it('unauth: after authPopup, the request should fail after calling Appbase.unauth()', function(done) {
      Appbase.unauth()
      Appbase.ns('tweet').search({text:'hello', properties: ['msg']},function(err, array) {
        expect(err).to.equal("024: No app token specified")
        done()
      })
      expect(Appbase.getAuth()).to.be.null;
    })
  })
})