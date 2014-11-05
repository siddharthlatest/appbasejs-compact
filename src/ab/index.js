var ab = {};
var config = require("./../config.js");
ab.interface = require("./interface.js");
if(config.isWindow) ab.auth = require("./auth.js");
ab.cache = require("./cache.js");
ab.server = require("./server.js");
ab.util = require("./util.js");
ab.firing = require("./firing.js");
ab.inputHandling = require('./input-handling.js');
module.exports = ab;