
var _ = require("lodash");
var browserify = require('browserify');
var path = require("path");
var fs = require("fs");
var through = require("through2");
var juicerify = require("juicerify");

var log = global.log;


module.exports = {
  compile : compile
};

/**
 globalExpose = {dirname : expose }
**/

var fileCache = {} , cache = {};

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
        cache:  cache,
        packageCache: fileCache,
        paths : options.paths || undefined
    });


    var globalExpose = {};

    if (options.globalExpose) {
        globalExpose = options.globalExpose;
    }


    var add =  function(file_path) {
        var expose = file_path.expose, 
            reqs = file_path.require || [],
            external = file_path.external || [],
            ignore = file_path.ignore || [];


        file_path = file_path.src;
        if (typeof expose === "string") {
          bundle.add(file_path, {expose : expose });
          globalExpose[path.relative(options.basedir,file_path)] = expose;
        } else if (expose === true) {
          bundle.add(file_path);
          bundle._bpack.hasExports = true;
        } else {
          bundle.add(file_path);
        }
        _.forEach(reqs, function(mod) {
          bundle.require(mod);
        });
        _.forEach(external, function(mod) {
          bundle.external(mod);
        });
        _.forEach(ignore, function(mod) {
          bundle.ignore(mod);
        });
        
    }

    add( { src : file_path, 
      expose : options.expose , 
      require : options.require , 
      external : options.external,
      ignore : options.ignore
    });

    for (var i = 0; i < (options.transform || []).length; i++) {
        var transform = options.transform[i];
        if (Array.isArray(transform)) {
            bundle.transform(transform[1], transform[0]);
        } else {
          // old version(1.0.0) hack
          if (transform === "juicerify") {
            bundle.transform(juicerify);
          } else {
            bundle.transform(transform);
          }
        }
    }

    if (options.expose || (options.isParent || !_.isUndefined(options.parents))) {
      //replace label id
      bundle = replaceLabelId(bundle, options, globalExpose);
    }

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

