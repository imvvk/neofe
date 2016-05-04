var mdeps = require("module-deps");
var through = require("through2");
var path = require("path");
var browserify = require("browserify");
var _ = require("lodash");

var nutils = require("./neo_utils.js");
var wrapBuildSassBundle = require("./browserify_sass.js");

module.exports = pacBundle;
module.exports.findCommonDeps = findCommonDeps;

// build child exclude parent require
function pacBundle(b, opts, browserify_options, cb) {

  var parents = opts.parents; // the parents file of child file;
  var isParent = opts.isParent; // is a  parent of one child file ;

  b._bpack.hasExports = true;

  if (parents) {
    if (!(parents instanceof Array)) {
      parents = [parents];
    }

    if (parents.length && false ) {
      var deps_keys = {};
      var count = parents.length;
      parents.forEach(function(file) {
        var md = concatDeps(file, browserify_options, deps_keys);
        md.bundle(function() {
          count--;
          if (count === 0) {
            //b.external(externals);
            b.pipeline.get("deps").push(through.obj(function(row, enc, next) {
              if (deps_keys[row.id]) {
                return next();
              }
              return next(null, row);
            }));
            cb(b);
          }
        });
      });
    } else {
      cb(b);
    }
  } else {
    cb(b);
  }


}

function concatDeps(file, options, key_map) {

  var bundle = createSimpleBundle(file, options);
  bundle.pipeline.get("deps").push(through.obj(function(row, enc, next) {
    if (!key_map[row.id]) {
      key_map[row.id] = row.id;
    }
    next(null, row);
  }));
  /**
  process.nextTick(function() {
    bundle.bundle();
  });
  **/
  return bundle;

}

/**
function concatDeps(file,options,key_map) {
  var opts = extend({},options);
  var md = mdeps(opts);
  md.pipe(transform(key_map));
  md.end(path.join(options.basedir,file));
  return md;
}
**/


//将依赖存储到key_map
function transform(key_map) {
  return through.obj(function(row, enc, next) {
    if (!row.entry && !key_map[row.id]) {
      key_map[row.id] = row.id;
    }
    next(null, row);
  });
}


function createSimpleBundle(file,options){
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
    cache: {},
    packageCache: {},
    paths: options.paths || undefined
  });

  bundle.add(path.join(options.basedir,file));

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
  //只是为了找出依赖 参数简单配置
  wrapBuildSassBundle(bundle,{},true);
  return bundle;
}

function findCommonDeps(files,options,cb) {
  var deps = {} , common_deps = [];
  if (_.isArray(files) && files.length > 1) {
    var basedir = options.basedir || process.cwd();
    var len = files.length;
    files.forEach(function(file){
      var b = createSimpleBundle(file,options);
      b.pipeline.get("deps").push(through.obj(function(row, enc, next){
        if(!row.entry && !deps[row.id]) {
          deps[row.id] = 1;
        } else {
          deps[row.id] ++;
        }
        this.push(row);
        next();
      }));
      b.bundle(function(){
          len--;
          if (len === 0){
            common_deps = Object.keys(deps).filter(function(key){
              return deps[key] > 1;
            }).map(function(file){
              var dir = path.relative(basedir,file);
              return dir;
            });
            cb && cb(common_deps);

          }
      });
    });
  } else {
    console.error("input files error not a array or length lss 1");
  }
}
