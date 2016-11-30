
var NodeCache = require("node-cache");

function create () {
  // 300 second  as ttl
  var instance = new NodeCache({ stdTTL: 300, checkperiod : 60});
  return instance;
}


module.exports.init = function () {
  return create();
}
