var server = require("../lib/server.js");
var sync = require("../lib/sync.js");
var findCommonDeps = require("../lib/pac_bundle.js").findCommonDeps;
var loadConfig = require("../lib/load_config.js");
var pack = require("../lib/pack.js");
var fs = require("fs");
var path = require("path");

module.exports.server = function(options) {
  var cwd = process.cwd();
  return server(cwd, options);
};

module.exports.build = function() {
  return pack(process.cwd(), true);
};
module.exports.pack = function() {
  return pack(process.cwd(), false);
};

module.exports.deploy = function(task, dist) {
  return sync(process.cwd(), task, dist);
};

module.exports.init = function() {
  var cwd = process.cwd();
  var config_path = path.join(cwd, "./neofe.config");
  var exist = fs.statSync(config_path);
  console.log(config_path);
  if (exist) {
    console.error("neofe.config already exists!")
    return;
  } 
  var content = fs.readFileSync(path.join(__dirname,"../","./snippets/neofe.json"));
  var fsw = fs.createWriteStream(config_path);
  fsw.write(content);
  fsw.end();
};


module.exports.show_common_deps = function(files) {
  var cwd = process.cwd();
  var config = loadConfig(cwd);
  var options = config.browserify.options;
  findCommonDeps(files , options , function(common_deps){
    console.log("files common dependencies :");
    console.log(JSON.stringify(common_deps,null , " "));
  });
};
