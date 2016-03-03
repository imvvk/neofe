
var server = require("../lib/server.js");
var build = require("../lib/build.js");
var sync = require("../lib/sync.js");
var upload = require("../lib/upload_aliyun.js");

module.exports.server = function(port){
  var cwd = process.cwd();
  return server(cwd,{port:port});
}

module.exports.build = function(){
  return build(process.cwd());
}

module.exports.deploy = function(task,dist){
  return sync(process.cwd(),task,dist);
}

module.exports.deployS = function(task,dist){
  return upload(process.cwd(),task,dist);
}
