/**
 * Created by Sagar on 12/8/14.
 */
angular.module('ngAppbase',[])
  .factory('$appbaseRef',function($timeout) {
    var ngAppbaseRef = function(input) {
      /* accepts a path, or an Appbase reference and returns ngAppbaseRef,
       a wrapper that supports $bindProperties and $bindEdges, which keeps updating a scope variable whenever the data is changed in Appbase.
       'bindProperties' binds a scope variable to properties of a vertex (a JSON object)
       'bindEdges' binds a scope variable to edges of a vertex, (an array), where edges are sorted by priorities. 'bindEdges' also returns an array object, which need not to be attached with a scope variable. Each object in array: {name: 'edgeName', priority:'edge priority', properties: {out vertex's properties}}
       */
      var ref;
      if(typeof input === "string")
        ref = Appbase.ref(input)
      else if(typeof input === "object" && typeof input.path() === "string")
        ref = input
      else throw ("Invalid argument to create an ngAppbaseRef")

      var onPropsUnbind
      var props
      var remoteScopeProps
      var bindProperties = function(remoteScope, varName, callbacks) {
        if(typeof varName === "object") {
          callbacks = varName || {}
          varName = undefined
        } else {
          var callbacks = callbacks || {}
        }

        props = {}
        varName && (remoteScope[varName] = props)
        var replaceObj = function(src, dest) {
          for(var prop in src) {
            delete src[prop]
          }

          for(var prop in dest) {
            src[prop] = dest[prop]
          }
        }

        ref.on('properties',function(error, ref, vSnap) {
          if(error) {
            throw error
            return
          }
          remoteScopeProps = remoteScope
          onPropsUnbind = callbacks.onUnbind
          var onProperties = callbacks.onProperties
          var done = function(){
            remoteScope.$apply()
          }
          replaceObj(props, vSnap.properties())
          if(onProperties) {
            onProperties(remoteScope, props, ref, done)
          } else {
            done()
          }
        })

        remoteScope.$on('$destroy', function() {
          unbindProperties()
        })

        return props
      }

      var edgeRefs = {}
      var edges = []
      var callbacks
      var bindSecondLevelEdges
      var bindOutVertex
      var secondLevelBinding
      var remoteScope
      var bindEdges = function(remoteS, varName, bindOutV, bindSecondLevelE, cb, reverse) {
        remoteScope = remoteS
        if(typeof varName === "boolean") {
          var reverse = cb
          callbacks = bindSecondLevelE || {}
          var bindSecondLevelEdges = bindOutV
          var bindOutVertex = varName
          varName = undefined
        } else {
          callbacks = cb || {}
          bindSecondLevelEdges = bindSecondLevelE
          bindOutVertex = bindOutV
        }
        secondLevelBinding = bindOutVertex || bindSecondLevelEdges

        var toBeDeleted = {}
        varName && (remoteScope[varName] = edges)

        var add = function(edgeSnap, edgeRef) {
          var name = edgeSnap.name()
          var priority = edgeSnap.priority()

          if(toBeDeleted[name] > 0) {
            toBeDeleted[name]--
            return
          }

          edgeRefs[name] && console.log("Shouldn't happen.")
          edgeRefs[name] = edgeRef

          var added;
          var edgeObj = { name:name, priority:priority }

          var addEdgeToArray  = function () {
            for(var i = 0; i<edges.length && !added; i++) {
              if(reverse? edges[i].priority < priority : edges[i].priority < priority) {
                edges.splice(i, 0, edgeObj)
                added = true
                break
              }
            }

            if(!added) {
              reverse? edges.unshift(edgeObj) : edges.push(edgeObj)
              added = true
            }

            if(toBeDeleted[name] > 0) {
              toBeDeleted[name]--
              remove(edgeSnap)
            }
          }

          edgeRef.on('properties',function(error, r, outVertexSnap) {
            !bindOutVertex && edgeRef.off('properties')
            if(!callbacks.onAdd || added) {
              remoteScope.$apply(function() {
                edgeObj.properties = outVertexSnap.properties()
                if(!added) {
                  addEdgeToArray()
                }
              })
            } else {
              edgeObj.properties = outVertexSnap.properties()
            }

            if(!added && callbacks.onAdd) {
              callbacks.onAdd(remoteScope ,edgeObj, edgeRef, remoteScope.$apply.bind(remoteScope, addEdgeToArray))
            } else if(added && callbacks.onChange) {
              callbacks.onChange(remoteScope ,edgeObj, edgeRef, remoteScope.$apply.bind(remoteScope, addEdgeToArray))
            }
          })

          if(bindSecondLevelEdges)
            edgeObj.edges = ngAppbaseRef(edgeRef).$bindEdges(remoteScope, true)
        }

        var remove = function(edgeSnap) {
          var name = edgeSnap.name()
          var deleted;
          for(var i = 0; i < edges.length; i++) {
            if(edges[i].name === name) {
              if(secondLevelBinding) {
                edgeRefs[name].off()
              }
              var proceedDeletetion = function() {
                $timeout(function() {
                  for(var j = 0; j < edges.length; j++) {
                    if(edges[j].name === name) {
                      edges.splice(j ,1)
                      break
                    }
                  }
                })
              }
              if(callbacks.onRemove){
                callbacks.onRemove(remoteScope, edges[i], edgeRefs[name], proceedDeletetion)
              }
              else
                proceedDeletetion()

              delete edgeRefs[name]

              deleted = true
              break
            }
          }
          if(!deleted){
            if(toBeDeleted[name] === undefined)
              toBeDeleted[name] = 0

            toBeDeleted[name]++
          }
        }

        ref.on('edge_added',function(error,edgeRef,edgeSnap) {
          if(error){
            throw error
            return
          }
          add(edgeSnap, edgeRef)
        })

        ref.on('edge_removed',function(error,edgeRef,edgeSnap) {
          if(error){
            throw error
            return
          }
          remove(edgeSnap)
        })

        ref.on('edge_changed',function(error,edgeRef,edgeSnap) {
          if(error) {
            throw error
            return
          }
          remove(edgeSnap)
          add(edgeSnap, edgeRef)
        })

        remoteScope.$on('$destroy', function() {
          unbindEdges()
        })

        return edges
      }

      var unbindProperties = function(){
        ref.off('properties')
        onPropsUnbind && onPropsUnbind(remoteScopeProps, props, ref)
      }

      var unbindEdges = function() {
        ref.off('edge_added')
        ref.off('edge_removed')
        ref.off('edge_changed')
        while(edges.length > 0) {
          bindSecondLevelEdges && edgeRefs[edges[i].name].off()
          var edgeObj = edges[0]
          var edgeRef = edgeRefs[edges[0].name]
          delete edgeRefs[edges[0].name]
          edges.splice(0, 1)
          callbacks.onUnbind && callbacks.onUnbind(remoteScope, edgeObj , edgeRef)
        }
      }

      return {
        $ref: function() {
          return ref
        },
        $setData: ref.setData,
        $removeData: ref.removeData,
        $path: ref.path,
        $URL: ref.URL,
        $setEdge: function($abRef, name ,priority ,callback){
          return ref.setEdge($abRef.$ref(), name, priority, callback)
        },
        $removeEdge: ref.removeEdge,
        $inVertex: function() {
          return ngAppbaseRef(ref.inVertex())
        },
        $outVertex: function(edgeName) {
          return ngAppbaseRef(ref.outVertex(edgeName))
        },
        $bindProperties:bindProperties,
        $bindEdges:bindEdges,
        $unbindProperties: unbindProperties,
        $unbindEdges: unbindEdges,
        $unbind: function() {
          unbindProperties()
          unbindEdges()
        }
      }
    }

    return ngAppbaseRef
  })
