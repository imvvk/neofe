var _ = require("lodash");
var path = require("path");
var fs = require("fs");
var through = require("through2");
var extend =  require('extend');
var url = require("url");
var querystring = require("querystring");
var Promise = require("bluebird");

var isArray = Array.isArray;

var sassfy = require("./sassfy.js");
var bundle_compile = require("./bundle_compile.js");


// default browserify options
var def_options = {
    external : [],
    ignore  : [],
    ignoreMissing : false,
    transform : [] ,
    insertGlobals : false,
    detectGlobals : false, //close
    standalone : false,
    noParse : [],
    extensions : [],
    basedir : undefined,
    debug : true
};

var cache = {} ,fileCache = {};

function build (realpath, file_config, packjson) {

  var b_opts = packjson.browserify;
  var options = extend({cache:cache , fileCache : fileCache }, def_options,b_opts.options || {} );

  // parent child detect
  if (_.isPlainObject(file_config)) {
    options.isParent = file_config.isParent;
    options.parents = file_config.parents;
    if (_.isObject(file_config.browserify)) {
      extend(options, file_config.browserify);
    } 
    //use file config first
    options.expose = file_config.expose;
    options.external = isArray(file_config.external) ? file_config.external : options.external;
    options.require = isArray(file_config.require) ? file_config.require : options.require;
    options.ignore = isArray(file_config.ignore) ? file_config.ignore  : options.ignore;
    options.containCss = _.isUndefined(file_config.containCss) ? b_opts.containCss : file_config.containCss;
  }

  var global_sassfy = _.isBoolean(file_config.globalSassfy) ?  file_config.globalSassfy : true; 
  
  var bundle = bundle_compile.compile(realpath,options);
  var sass_strs = [];

  bundle.transform(sassfy, {store: sass_strs, global : global_sassfy });

  return new Promise(function (resolve, reject) {

    bundle.bundle(function (err, script_text) {
      if (err) {
        reject(err);
      } else {
        var style_text = sass_strs.join("");
        resolve({
          style_text : style_text, 
          script_text : script_text
        });
      }
    });
  });
}


module.exports = {
  build : build
}
