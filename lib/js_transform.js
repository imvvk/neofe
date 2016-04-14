var Promise = require('promise');
var prepare = require('prepare-response');
var browserify = require('browserify');
var aliasify = require("aliasify");
var path = require("path");
var fs = require("fs");
var through = require("through2");
// bundle sass css
var wrapBuildSassBundle = require("./browserify_sass.js");

var bundle_config = {};
var extend =  require('util')._extend
var noop = function(){};
var juicerify = require("juicerify");
var neo_utils = require("./neo_utils.js");

var get_deps = neo_utils.get_deps;
var load_src_snippets = fs.readFileSync(path.join(path.dirname(__filename), "../snippets/load_src.txt.js")).toString();
var cache = {} ,fileCache = {};

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
    debug : false
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
        var options = extend({cache:cache , fileCache : fileCache },b_opts.options || {}, def_options);
        options.basedir =  options.basedir || req.basedir;
        options.aliasify = b_opts.aliasify;
        var bundle;
        if (options.single) {
          bundle = bundelFactory(req,options);
        } else {
          bundle = compile(realpath,options);
        }
        bundle = wrapBuildSassBundle(bundle);
        getResponse(bundle,options,isOutCss).send(req,res,next);
    }
}

function compile(path,options) {
    var bundle = browserify({
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



function getResponse(bundle, options,isOutCss) {
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

function bundelFactory(req,options) {
  var query = req.query;
  var bundle ;
  options.fullPaths = true;
  //b._bpack.hasExports = true;
  if (true && query && query["__single"]) {
    bundle = compile(req.realpath,options);
    bundle._bpack.hasExports = true;
    bundle.pipeline.get("deps").push(through.obj(function(row , enc, next){
      if (!row.entry) return next();
      delete row.entry;
      //row.deps = {};
      this.push(row);
      next();
    }));
  } else {
    //main reqeust
    bundle = compile(req.realpath,options);
    // find replace perfix
    var url = '//' + req.headers.host + req.url;
    url = url.replace(/\?[^\?]*$/g,"").replace(/(@[^@]+)?\.(js|css)/,"");
    var prefix_obj = neo_utils.find_prefix(url , req.realpath.replace(/\.[^\.]+$/g,""));

    var deps = [],deps_arr;
    var load_sub_bundle = through.obj(function (row, enc, next) {
        deps.push({file:row.file,deps:row.deps,index :row.index,entry : row.entry});
        if (!row.entry) return next();

          deps_arr = get_deps(deps,row).map(function(dep){
            return dep.replace(prefix_obj.file_prefix,prefix_obj.url_prefix)+"?__single=true";
          });
        //deps_arr.splice(deps_arr.length - 1 ,1);
        //reset deps;
        //row.deps = {};
        row.source = load_src_snippets.replace("{{deps}}",JSON.stringify(deps_arr)).replace("{{fn}}" , row.source);
        this.push(row);
        next();
    });
    bundle.pipeline.get("deps").push(load_sub_bundle);
    /**
    bundle.pipeline.get("sort").push(through.obj(function(row,enc,next){
        if (!row.entry) return next();
        var deps =  row.deps;
        var indexDeps = row.indexDeps;
        var deps_arr = Object.keys(indexDeps).map(function(key,i){
            return  {key:key,index : indexDeps[key]};
        }).sort(function(p,n){
            return p.index - n.index;
        }).map(function(obj){
          var src = deps[obj.key];
          if (src){
            return src.replace(prefix_obj.file_prefix,prefix_obj.url_prefix)+"?__single=true";
          } else {
            return false;
          }
        }).filter(function(src){
          return src;
        });
        console.log(deps_arr);
        row.source = load_src_snippets.replace("{{deps}}",JSON.stringify(deps_arr)).replace("{{fn}}" , row.source);
        this.push(row);
        next();
    }))
    **/
  }

  bundle.pipeline.get("label").splice(0, 1, through.obj(function(row,enc,next){
    row.id = row.file.replace(options.basedir,"");
    Object.keys(row.deps).forEach(function (key) {
       if(row.deps[key])
       row.deps[key] = row.deps[key].replace(options.basedir,"");
   });
    this.push(row);
    next();
  }))
  /**
  bundle.pipeline.get("emit-deps").push(through.obj(function(row,enc,next){
      var source = row.source;
      delete row.source;
      console.log(row);
      row.source = source;
      this.push(row);
      next();
  }));
  ***/
  return bundle;

}

function createSingleBundle(){

}

module.exports = js_transform;
module.exports.compile =  compile;
