var server = require("../lib/server.js");
var build = require("../lib/build.js");
var sync = require("../lib/sync.js");
var findCommonDeps = require("../lib/pac_bundle.js").findCommonDeps;
var loadConfig = require("../lib/load_config.js");


module.exports.server = function(options) {
  var cwd = process.cwd();
  return server(cwd, options);
}

module.exports.build = function() {
  return build(process.cwd());
}

module.exports.deploy = function(task, dist) {
  return sync(process.cwd(), task, dist);
}


module.exports.show_common_deps = function(files) {
  var cwd = process.cwd();
  var config = loadConfig(cwd);
  var options = config.browserify.options;
  findCommonDeps(files , options , function(common_deps){
    console.log("files common dependencies :");
    console.log(JSON.stringify(common_deps,null , " "));
  });
}
