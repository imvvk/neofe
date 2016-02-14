var Promise = require('promise');
var prepare = require('prepare-response');
var browerifyInc = require('browserify-incremental');
var browerify = require('browserify');
var aliasify = require("aliasify");
var bundle_config = {};
var extend = require('extend');
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
    grep : /\.js$/,
    cache : false,
    minify : false,
    gzip : true,
    debug : false
};

var options_map = {};

var browserify_middleware = function(config){
   var opts = config.options;
    return function(req,res,next){
        var file_pathname = req.file_pathname;
        var realpath = req.realpath;
        var options = extend({},def_options,opts);
        var bundle = compile(realpath,options);
        if (config.aliasify) {
          bundle.transform(aliasify , config.aliasify);
        }
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

    if (options.plugins) {
        var plugins = options.plugins; // in the format options.plugins = [{plugin: plugin, options: options}, {plugin: plugin, options: options}, ... ]
        for(var i = 0; i < plugins.length; i++) {
            var obj = plugins[i];
            bundle.plugin(obj.plugin, obj.options);
        }
    }
    if (Array.isArray(path)) {
        for (var i = 0; i < path.length; i++) {
            if (typeof path[i] === 'object') { // obj spec support; i.e. {"jquery": {options...}}
                var spec = path[i];
                var keys = Object.keys(spec);
                keys.forEach(function (key) {
                    if (spec[key].run) {
                        bundle.add(key, spec[key]);
                    } else {
                        bundle.require(key, spec[key]);
                    }
                })
            } else {
                bundle.require(path[i]);
            }
        }
    } else {
        bundle.add(path);
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
    if (options.events) {
        var events = options.events;
        var keys = Object.keys(events);
        keys.forEach(function (key) {
            bundle.on(key,events[key]);
        }); 
    }
    return bundle;
}



function getResponse(bundle, options) {
  var headers = {'content-type': 'application/javascript;charset=UTF-8'};
  var response = getSource(bundle).then(function (src) {
    return prepare(src, headers, {gzip: options.gzip})
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
        bundle.emit("postbundle",src);
        resolve(src);
      });
  }).then(function (src) {
    src = src.toString();
    return src;
  });

}

module.exports = browserify_middleware;
