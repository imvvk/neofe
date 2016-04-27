
var mdeps = require("module-deps");
var through = require("through2");


module.exports = pacBundle;

// build child exclude parent require
function pacBundle(b, opts , browserify_options) {

  var parents = opts.parents; // the parents file of child file;
  var isParent = opts.isParent; // is a  parent of one child file ;

  if (isParent) {
      b._bpack.hasExports = true;
  }
  if (parents) {
    if (!(parents instanceof Array)) {
      parents = [parengs];
    }

    if (parents.length) {
      var deps_keys = {};
      parents.forEach(function(file){
        concatDeps(file, browserify_options,deps_keys);
      });

      b.pipeline.get("deps").push(through.obj(function(row, enc, next){
        if (deps_keys[row.id]) {
          return next();
        }
        return next(null,row);
      }));
    }
  }

  return b;
}



function concatDeps(file,options,key_map) {
  var basedir = options.basedir || process.cwd();
  var opts = {
    basedir : basedir
  };

  if (options.paths) {
    opts.paths = options.paths;
  }
  var md = mdeps();
  md.pipe(transform(key_map));
  md.end(file);
}

//将依赖存储到key_map
function transform(key_map) {
  return through.obj(function(row, enc, next){
    if (!row.entry && !key_map[row.id]) {
      key_map[row.id] = row.id;
    }
    next(null,row);
  });
}
