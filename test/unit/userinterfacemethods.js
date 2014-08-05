var expect = chai.expect
var baseUrl = "http://app.sagar.appbase.io/"

describe('interface methods', function(){

    describe('appbase.new',function(){

        it("new vertex- with key- should not give an error, and ref should point to the proper path", function(done){
            var path = baseUrl + "Materials/Wood";
            Appbase.new(path,function(error,ref){
                if(!error){
                    expect(ref.path()).to.be.equal(path);
                    done();
                } else {
                    done(error);
                }

            })
        })

        it("new vertex- without key- should not give an error, and ref should point to the proper path", function(done){
            var path = baseUrl + "Materials";
            Appbase.new(path,function(error,ref){
                if(!error){
                    var refPath = ref.path();
                    expect(refPath.slice(0,refPath.lastIndexOf('/'))).to.be.equal(path);
                    done();
                } else {
                    done(error);
                }

            })
        })

    })


    describe('paths',function(){

        var path = baseUrl + "Materials/Wood";
        var ref = new ab.interface.ref(path);

        it("should return  ref's path path", function(){
            expect(ref.path()).to.equal(path);
        })

        it("should return outVertex's ref",function(){
            var edgeName = 'outV';
            expect(ref.outVertex(edgeName).path()).to.equal(path+'/'+edgeName);
        })

        it("should return inVertex's ref",function(){
            var edgeName = 'outV';
            var outVRef = ref.outVertex(edgeName);
            expect(outVRef.inVertex().path()).to.equal(path);
        })


    });

    describe('vertex data',function(){


        var path = baseUrl + "Materials/Wood";
        var ref = new ab.interface.ref(path);



        it("setData should not throw an error, return the proper reference",function(done){
            var data = {"color":"brown"};

            async.waterfall([
                function(callback) {
                    ref.setData(data, callback);
                }
            ], function(err, ref) {
                if(err)
                    done(err)

                else {
                    expect(ref.path()).to.equal(path);
                    done()
                }
            })

        })

        it("removeData- some properties- should not throw an error, return the proper reference",function(done){
            var data = ["color"];

            async.waterfall([
                function(callback) {
                    ref.removeData(data, callback);
                }
            ], function(err, ref) {
                if(err)
                    done(err)

                else {
                    expect(ref.path()).to.equal(path);
                    done()
                }
            })

        })


        it("removeData- all- should not throw an error, return the proper reference",function(done){

            async.waterfall([
                function(callback) {
                    ref.removeData(true, callback);
                }
            ], function(err, ref) {
                if(err)
                    done(err)

                else {
                    expect(ref.path()).to.equal(path);
                    done()
                }
            })

        })

    })

    describe('edges',function(){

        var edgePath = baseUrl+"Materials/Iron";
        var priority = 50;
        var path = baseUrl + "Materials/Wood";
        var ref = new ab.interface.ref(path);

        beforeEach(function(done) {
            Appbase.new(edgePath,function(error,ref){
                if(!error){
                    done();
                } else {
                    done(error);
                }

            });

        });


        it("setEdge- with an edge name, and priority- should not throw an error, return the proper reference",function(done){
            var edgeRef = Appbase.ref(edgePath);

            async.waterfall([
                function(callback) {
                    ref.setEdge({name:"theNameIsRock",ref:edgeRef,priority:priority}, callback);
                }
            ], function(err, ref){
                if(err)
                    done(err)

                else {
                    expect(ref.path()).to.equal(path);
                    done()
                }
            })

        })

        it("setEdge- with edge name and no priority (time)- should not throw an error, return the proper reference",function(done){
            var edgeRef = Appbase.ref(edgePath);

            async.waterfall([
                function(callback) {
                    ref.setEdge({name:"theNameIsUndeadRokr",ref:edgeRef}, callback);
                }
            ], function(err, ref){
                if(err)
                    done(err)

                else {
                    expect(ref.path()).to.equal(path);
                    done()
                }
            })

        })

    })




})