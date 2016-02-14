module.exports = function(opt){
  console.log(opt)
  var pj = require(opt.cwd+"/package.json");
  //console.log(process.env);
  //console.log(pj.browserify);
  compile(pj.browserify , opt.cwd);
}


var Promise = require('promise');
var prepare = require('prepare-response');
var browserify = require('browserify');
var browerifyInc = require('browserify-incremental');
var bundle_config = {};
var extend = require('extend');
var path = require("path");
var noop = function(){};


var def_options = {
    external : [],
    ignore  : [], 
    ignoreMissing : false,
    transform : [] ,
    insertGlobals : false,
    detectGlobals : true,
    standalone : false,
    noParse : [],
    extensions : [],
    basedir : undefined,
    debug : true
};


function mergeOptions(options,cwd){
  var opts = extend({},def_options,options);
  return opts;
}

function compile(browserify_config,cwd){
  var exports = browserify_config.exports;
  var options = mergeOptions(browserify_config.options,cwd);
  var bundle = browerifyInc({
    noParse: options.noParse,
    extensions: options.extensions,
    resolve: options.resolve,
    insertGlobals: options.insertGlobals,
    detectGlobals: options.detectGlobals,
    ignoreMissing: options.ignoreMissing,
    basedir: options.basedir,
    debug: options.debug,
    standalone: options.standalone || false,
    cache: {},
    packageCache:{},
    paths : options.paths || undefined
  });

  if (Array.isArray(exports)){
    for (var i = 0, len = exports.length; i < len; i++) {
      bundle.add(exports[i]);
    }
  } else {
    bundle.add(exports);
  }

  for (var i = 0; i < (options.external || []).length; i++) {
        bundle.external(options.external[i]);
  }
  for (var i = 0; i < (options.ignore || []).length; i++) {
        bundle.ignore(options.ignore[i]);
  }

  for (var i = 0; i < (options.transform || []).length; i++) {
    var transform = options.transform[i];
    if (Array.isArray(transform)) {
      bundle.transform(transform[1], transform[0]);
    } else {
      bundle.transform(transform);
    }
  }

  
  console.time("====")
  bundle.bundle(function(err,src){
    if (err) {
      console.error(err);
      return ;
    }
    console.log(src.toString())
    console.timeEnd("====")
  });

}



