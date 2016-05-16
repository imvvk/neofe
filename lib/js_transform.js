var _ = require("lodash");
var Promise = require('promise');
var prepare = require('prepare-response');
var path = require("path");
var fs = require("fs");
var through = require("through2");
var extend =  require('extend');
var url = require("url");
var querystring = require("querystring");

var br_complie = require("./br_compile.js");
// bundle sass css
var wrapBuildSassBundle = require("./browserify_sass.js");
var wrapParentAndChildBundle = require("./pac_bundle.js").wrapParentAndChildBundle;

var noop = function(){};
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
        var isOutCss = !!req.headers.accept.match(/text\/css/i) ||
                        querystring.parse(url.parse(req.url).query || "").css;
        if (!packjson) {
          var e =  new Error("req can't find a packjson");
          return next(e);
        }
        var b_opts = packjson.browserify;
        var options = extend({cache:cache , fileCache : fileCache  },def_options,b_opts.options || {} );
        options.basedir =  options.basedir || req.basedir;

        // parent child detect
        if (_.isObject(req.file_config)) {
          var file_config = req.file_config;
          options.isParent = file_config.isParent;
          options.parents = file_config.parents;
          options.expose = file_config.expose;
          //use file config first 
          options.containCss = _.isUndefined(file_config.containCss) ? options.containCss : file_config.containCss;
        }

        //build bundle
        var bundle = br_complie.compile(realpath,options);

        //callback
        var callback = function(bundle) {
          // add require css
          bundle = wrapBuildSassBundle(bundle,options.sass, options.containCss);
          getResponse(bundle,options,isOutCss).send(req,res,next);
        }
        wrapParentAndChildBundle(bundle,options,callback);
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
    src = (src || "").toString();
    return src;
  });
}

module.exports = js_transform;
