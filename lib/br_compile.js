
var _ = require("lodash");
var browserify = require('browserify');
var aliasify = require("aliasify");
var path = require("path");
var fs = require("fs");
var through = require("through2");
var juicerify = require("juicerify");

var log = global.log;


module.exports = {
  compile : compile,
  bundelFactory : bundelFactory
};

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

    if (options.expose) {
        bundle.require(path, {expose : options.expose });
    }

    for (var i = 0; i < (options.external || []).length; i++) {
        bundle.external(options.external[i]);
    }

    for (var i = 0; i < (options.ignore || []).length; i++) {
        bundle.ignore(options.ignore[i]);
    }
    // aliasify set config  is complex json  sometimes
    if (options.browserify) {
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

    //replace label id
    bundle = replaceLabelId(bundle, options);

    return bundle;
}

/**
 * replace label id from index number to path
 *
 * @param bundle
 * @param options
 * @return bundle
 **/

function replaceLabelId(bundle, options) {
  var basedir;
  if (!_.isString(options.basedir)) {
    basedir = process.cwd();
  } else if(!options.basedir.match(/^\//)) {
    basedir = path.resolve(process.cwd(),options.basedir);
  } else {
    basedir = options.basedir;
  }
  log.debug("basedir====",basedir);
  bundle.pipeline.get("label").splice(0, 1, through.obj(function(row, enc, next) {
    row.id = path.relative(basedir, row.file);
    Object.keys(row.deps).forEach(function (key) {
      if(row.deps[key])
        row.deps[key] = path.relative(basedir,row.deps[key]);
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
