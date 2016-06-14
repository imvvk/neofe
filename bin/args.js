/***
 * neofe cmd js 
 *
 ***/
var fs = require("fs");
var path = require("path");
var chalk = require("chalk");

var server = require("../lib/server.js");
var sync = require("../lib/sync.js");
var findCommonDeps = require("../lib/pac_bundle.js").findCommonDeps;
var loadConfig = require("../lib/load_config.js");
var pack = require("../lib/pack.js");

module.exports.server = function(options) {
  var cwd = process.cwd();
  return server(cwd, options);
};

module.exports.build = function(task) {
  return pack(process.cwd(), true, task);
};
module.exports.pack = function(task) {
  return pack(process.cwd(), false, task);
};

module.exports.deploy = function(task, dest, not_prompt) {
  return sync(process.cwd(), task, dest, not_prompt);
};

module.exports.init = function() {
  var cwd = process.cwd();
  var config_path = path.join(cwd, "./neofe.config");
  var exist = fs.existsSync(config_path);
  if (exist) {
    console.log(chalk.red("neofe.config already exists!"));
    return;
  } 
  var content = fs.readFileSync(path.join(__dirname,"../","./snippets/neofe.json"));
  var fsw = fs.createWriteStream(config_path);
  fsw.write(content);
  fsw.end();
  console.log(chalk.green("neofe.config create success! path is %s"), config_path);
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
