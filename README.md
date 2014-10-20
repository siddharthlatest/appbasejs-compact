# AppbaseJS
JavaScript library for Appbase [Appbase.io](http://appbase.io)

## Get Appbase
Node: `npm install appbasejs`

Browser: [https://cdn.appbase.io/2.0/appbase.js](https://cdn.appbase.io/2.0/appbase.js)

## Dev
Do `npm install` inside the folder to install devDependencies.

#### Browser Build
`npm run-script build`

#### Testing
`npm test` for node.

Goto [/test/browser/index.html](http://sids-aquarius.github.io/appbasejs-compact/test/browser) for browser tests.

## Play
Node:
```js
Appbase = require('appbasejs');
```

Browser:
```html
<script src="./dist/appbase.min.js"></script>
```

#### Put Credentials
```js
Appbase.credentials('app','secret');
```

#### Appbase references
Now let's create two Appbase references under namespaces "user" and "tweets".

```js
var userRef = Appbase.ns("user").v("andy");
var tweetRef = Appbase.ns("tweet").v(Appbase.uuid());
```

As seen here, one can optionally specify the reference name.

#### Working with Data

```js
userRef.setData({
    status: "sudo",
    location: "Belo Horizonte, Brazil"
});
tweetRef.setData({
    message: "Remember Red, hope is a good thing."
});
```

Now let's add the tweet as an edge to our user reference.

```js
userRef.setEdge(tweetRef, 'tweeted');
```
#### Go real-time! 

Listen to the changes on the user reference data properties and edges, to see the changes we have made so far.

```js
userRef.on('properties', function(error, ref, userSnap) {
    console.log(userSnap.properties().status);
    console.log(userSnap.properties().location);
});
userRef.on('edge_added', function(error, edgeRef, eSnap) {
    edgeRef.on('properties', function(error, ref, tweetSnap) {
        console.log(tweetSnap.properties().message);
    });
});
```

#### Full-text search

```js
Appbase.ns('tweet').search({text:'hello', properties: ['message']},function(err, array) {
    console.log(array);
})
```

