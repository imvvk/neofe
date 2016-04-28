
var mdeps = require("module-deps");
var through = require("through2");
var path = require("path");

module.exports = pacBundle;

// build child exclude parent require
function pacBundle(b, opts , browserify_options,cb) {

  var parents = opts.parents; // the parents file of child file;
  var isParent = opts.isParent; // is a  parent of one child file ;

  if (isParent) {
      b._bpack.hasExports = true;
  }
  if (parents) {
    if (!(parents instanceof Array)) {
      parents = [parents];
    }

    if (parents.length) {
      var deps_keys = {};
      var count = parents.length;
      parents.forEach(function(file){
        var md = concatDeps(file, browserify_options,deps_keys);
        md.on("end",function(){
          count--;
          if (count === 0) {
            var externals = Object.keys(deps_keys).map(function(key){
              var path_id = path.relative(browserify_options.basedir , deps_keys[key]);
              return path_id;
            })
            console.log("externals",externals);
            b.external(externals);
            cb(b);
          }
        });
      });
            /**
      b.pipeline.get("deps").push(through.obj(function(row, enc, next){
        if (deps_keys[row.id]) {
          return next();
        }
        return next(null,row);
      }));
      **/
    } else {
      cb(b);
    }
  } else {
    cb(b);
  }

}



function concatDeps(file,options,key_map) {
  var basedir = options.basedir || process.cwd();
  var opts = {
    transform : options.transform || [],
    basedir : basedir,
    paths : options.paths
  };

  var md = mdeps();
  md.pipe(transform(key_map));
  md.end(file);
  return md;
}

//将依赖存储到key_map
function transform(key_map) {
  return through.obj(function(row, enc, next){
    console.log("xxxxxxxxxx=",row.id)
    if (!row.entry && !key_map[row.id]) {
      key_map[row.id] = row.id;
    }
    next(null,row);
  });
}
