var _ = require("lodash");
var Promise = require('promise');
var prepare = require('prepare-response');
var path = require("path");
var fs = require("fs");
var through = require("through2");

var br_complie = require("./br_compile.js");
// bundle sass css
var wrapBuildSassBundle = require("./browserify_sass.js");

var bundle_config = {};
var extend =  require('extend');
var noop = function(){};
var neo_utils = require("./neo_utils.js");
var pacBundle = require("./pac_bundle.js");

var get_deps = neo_utils.get_deps;
var load_src_snippets = fs.readFileSync(path.join(path.dirname(__filename), "../snippets/load_src.txt.js")).toString();
var cache = {} ,fileCache = {};

var log = global.log;

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


function js_transform(options){
    return function(req,res,next){
        var realpath = req.realpath;
        var packjson = req.packjson;
        var isOutCss = !!req.url.match(/\.css$/);
        if (!packjson) {
          var e =  new Error("req can't find a packjson");
          return next(e);
        }
        var b_opts = packjson.browserify;
        var options = extend({cache:cache , fileCache : fileCache  },def_options,b_opts.options || {} );
        options.basedir =  options.basedir || req.basedir;

        options.browser = b_opts.browser;
        options.shim = b_opts.shim;

        // parent child detect
        if (_.isObject(req.file_config)) {
          var file_config = req.file_config;
          options.isParent = file_config.isParent;
          options.parents = file_config.parents;
          options.expose = file_config.expose;
        }

        //build bundle
        var bundle;
        if (options.single) {
          bundle = br_complie.bundelFactory(req,options);
          callback(bundle);
        } else {
          bundle = br_complie.compile(realpath,options);
          var pac_options = {
            isParent : options.isParent,
            parents : options.parents
          };

          log.debug("pac_options === ", pac_options);

          if (!(_.isUndefined(pac_options.isParent) && _.isUndefined(pac_options.parents))) {
            delete options.isParent;
            delete options.parents;
            bundle = pacBundle(bundle, pac_options, options, callback);
          } else {
            callback(bundle);
          }

        }

        function callback(bundle) {
          // add require css
          bundle = wrapBuildSassBundle(bundle);
          getResponse(bundle,options,isOutCss).send(req,res,next);
        }
    }
}

function getResponse(bundle, options, isOutCss) {
  var headers ;
  if (!isOutCss) {
    headers = {'content-type': 'application/javascript;charset=UTF-8'};
  } else {
    headers = {'content-type': 'text/css; charset=UTF-8'};
  }
  var response = getSource(bundle,isOutCss).then(function (src) {
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

function getSource(bundle,isOutCss) {
  return new Promise(function (resolve, reject) {
      bundle.bundle(function (err, js_src ,css_src) {
        if (err) return reject(err);
        if (!isOutCss) {
          resolve(js_src);
        } else {
          resolve(css_src);
        }
      });
  }).then(function (src) {
    src = src.toString();
    return src;
  });
}

module.exports = js_transform;
