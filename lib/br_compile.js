
var _ = require("lodash");
var browserify = require('browserify');
var path = require("path");
var fs = require("fs");
var through = require("through2");
var juicerify = require("juicerify");

var log = global.log;


module.exports = {
  compile : compile,
  bundelFactory : bundelFactory
};

/**
 globalExpose = {dirname : expose }
**/

function compile(file_path,options) {
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

    var globalExpose = {};

    if (options.globalExpose) {
        globalExpose = options.globalExpose;
    }
    if (options.expose) {
      bundle.add(file_path, {expose : options.expose });
      globalExpose[path.relative(options.basedir,file_path)] = options.expose;
    } else {
      bundle.add(file_path);
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

    //replace label id
    bundle = replaceLabelId(bundle, options, globalExpose);

    return bundle;
}

/**
 * replace label id from index number to path
 *
 * @param bundle
 * @param options
 * @return bundle
 **/

function replaceLabelId(bundle, options , globalExpose) {
  var basedir = options.basedir;

  //change dedupe content deps id;
  bundle.pipeline.get("dedupe").splice(0,1,through.obj(function (row, enc, next) {

        if (!row.dedupeIndex && row.dedupe) {
            var key = path.relative(basedir,row.dedupe);
            row.source = 'arguments[4]['
                + JSON.stringify(key)
                + '][0].apply(exports,arguments)'
            ;
            row.nomap = true;
        }
        else if (row.dedupeIndex) {
            var key = row.dedupeIndex;
            if (row.dedupe) {
              key = path.relative(basedir,row.dedupe);
              //globalExpose 优先
              key = globalExpose[key] || key;
            }

            row.source = 'arguments[4]['
                + JSON.stringify(key)
                + '][0].apply(exports,arguments)'
            ;
            row.nomap = true;
        }
        if (row.dedupeIndex && row.indexDeps) {
            row.indexDeps.dup = row.dedupeIndex;
        }
        this.push(row);
        next();
  }));

  bundle.pipeline.get("label").splice(0, 1, through.obj(function(row, enc, next) {
    var key = path.relative(basedir, row.file);
    row.id = globalExpose[key] ||  key;

    Object.keys(row.deps).forEach(function (key) {
      if(row.deps[key]){
        var dep_key = path.relative(basedir,row.deps[key]);
        row.deps[key] = globalExpose[dep_key] || dep_key;
      }
    });
    this.push(row);
    next();
  }));

  return bundle;
}

function bundelFactory(req,options) {
  var query = req.query;
  var bundle ;
  options.fullPaths = true;
  //b._bpack.hasExports = true;
  if (query && query["__single"]) {
    bundle = compile(req.realpath,options);
    bundle._bpack.hasExports = true;
    bundle.pipeline.get("deps").push(through.obj(function(row , enc, next){
      if (!row.entry) return next();
      delete row.entry;
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

  }
  /**
  bundle.pipeline.get("label").splice(0, 1, through.obj(function(row,enc,next){
    row.id = row.file.replace(options.basedir,"");
    Object.keys(row.deps).forEach(function (key) {
       if(row.deps[key])
       row.deps[key] = row.deps[key].replace(options.basedir,"");
   });
    this.push(row);
    next();
  }));
  ***/

  return bundle;

}
