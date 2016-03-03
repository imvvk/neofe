var Promise = require('promise');
var prepare = require('prepare-response');
var browerify = require('browserify');
var aliasify = require("aliasify");
var bundle_config = {};
var extend =  require('util')._extend
var noop = function(){};
var juicerify = require("juicerify");

// default browerify options
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
    debug : false
};


function js_transform(devContext){

    return function(req,res,next){
        var file_pathname = req.file_pathname;
        var realpath = req.realpath;
        var packjson = req.packjson;
        if (!packjson) {
          var e =  new Error("req can't find a packjson");
          return next(e);
        }
        var b_opts = packjson.browserify;
        var options = extend({},b_opts.options || {}, def_options);
        options.basedir =  options.basedir || req.basedir;
        options.aliasify = b_opts.aliasify;
        var bundle = compile(realpath,options);
        getResponse(bundle,options).send(req,res,next);
    }
}

function compile(path,options) {
    var bundle = browerify({
        noParse: options.noParse,
        extensions: options.extensions,
        resolve: options.resolve,
        insertGlobals: options.insertGlobals,
        detectGlobals: options.detectGlobals,
        ignoreMissing: options.ignoreMissing,
        basedir: options.basedir,
        debug: options.debug,
        standalone: options.standalone || false,
        cache:  {},
        packageCache: {},
        paths : options.paths || undefined
    });

    bundle.add(path);

    for (var i = 0; i < (options.external || []).length; i++) {
        bundle.external(options.external[i]);
    }

    for (var i = 0; i < (options.ignore || []).length; i++) {
        bundle.ignore(options.ignore[i]);
    }
    // aliasify set config  is complex json  sometimes
    if (options.aliasify) {
      bundle.transform(aliasify , options.aliasify);
    }

    for (var i = 0; i < (options.transform || []).length; i++) {
        var transform = options.transform[i];
        if (Array.isArray(transform)) {
            bundle.transform(transform[1], transform[0]);
        } else {
            if (transform === "juicerify"){
              bundle.transform(juicerify);
            } else {
              bundle.transform(transform);
            }
        }
    }

    return bundle;
}



function getResponse(bundle, options) {
  var headers = {'content-type': 'application/javascript;charset=UTF-8'};
  var response = getSource(bundle,options).then(function (src) {
    return prepare(src, headers, {gzip: false})
  }).then(function (response) {
    return syncResponse = response;
  })
  var syncResponse;
  return {
    send: function (req, res, next) {
      if (syncResponse) return syncResponse.send(req, res);
      else return response.done(function (response) { response.send(req, res); }, next);
    },
    dispose: noop
  };
}

function getSource(bundle) {
  return new Promise(function (resolve, reject) {
      bundle.bundle(function (err, src) {
        if (err) return reject(err);
        resolve(src);
      });
  }).then(function (src) {
    src = src.toString();
    return src;
  });

}

module.exports = js_transform;
module.exports.compile =  compile;
