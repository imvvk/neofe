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
var extend = require('extend');
var gulp = require("gulp");
var rename = require("gulp-rename");

module.exports.server = function(options) {
  var cwd = process.cwd();
  return server(cwd, options);
};

module.exports.build = function(task, options) {
  return pack(process.cwd(), true, task, options);
};
module.exports.pack = function(task, options) {
  return pack(process.cwd(), false, task, options);
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

var DEFAULT_SASS_OPTION = {
  sourceMap: false,
  sourceMapEmbed: true,
  sourceMapContents: false,
  outputStyle : "compressed"
};


//快速构建 独立的 browserify 配置文件 
//配置文件目录 为 exports_external
module.exports.build_external = function(type, index) {
  var multiBrowserify = require("../lib/multi_browserify.js");
  var multiMinify = require("../lib/multi_minify.js");
  var cwd = process.cwd();
  var config = loadConfig(cwd);
  if (!(type === "scripts" || type === "styles")) {
    console.log("type must be scripts or styles");
    return;
  }
  var exports_external ;
  if (!(exports_external = config.exports_external)) {
    console.error("exports_external is not in neofe.config");
    return;
  }

  if (!exports_external[type]) {
    console.log("not found config in "+ type );
    return;
  }
  var type_external = exports_external[type];
  if (!Array.isArray(type_external)) {
    type_external = [type_external];
  }
  if (typeof index !== "undefined" && type_external[index] ) {
    build(type_external[index]); 
  } else {
    type_external.forEach(function(opts) {
      build(opts);
    });
  }
  // { file: "",  buildPath: }
 
  function build(opts) {
    var gp = require("gulp-print");
    var cwd = process.cwd();
    var buildPath = opts.buildPath || path.join(cwd,"build_external");
    var browerify_setting = opts.browserify || {};
    var options = extend({
      insertGlobals: false,
      debug: false
    }, browerify_setting);
    var file = opts.file;

    options.basedir = browerify_setting.basedir || cwd; 

    var p = gulp.src(file, { base: opts.basedir || cwd})
            .pipe(multiBrowserify(options, DEFAULT_SASS_OPTION, options.containCss , false));
    opts.minify = opts.minify || {
      script : {},
      style : {}
    };
    if (!opts.notmin) {
      p.pipe(multiMinify(opts.minify.script,opts.minify.style));
    }
    p.pipe(gp());
    if (opts.outfile) {
      p.pipe(rename(opts.outfile));
    }
    p.pipe(gulp.dest(buildPath));
  
  }

  
 
}
