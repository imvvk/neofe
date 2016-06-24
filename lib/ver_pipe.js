var gutil = require('gulp-util');
var through = require('through2');
var parsePath = require('path-parse');
var fse = require('fs-extra')
var path = require("path");
var extend = require("extend");
var PLUGIN_NAME = "ver_pipe";
var Log = require("log");
var log = new Log("info");

module.exports = function (options,build_path,ver_path) {
    var versions = {};
    return through.obj({ highWaterMark : process.env.highWaterMark || 1024 }, function (file, enc, cb) {
        if (file.isNull()) {
            this.push(file);
            return cb();
        }
        if (file.isStream()) {
            this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'));
            return cb();
        }
        var _p = file.path;
        var p = parsePath(_p);
        var md5hash = p.name.match(/@(\w+)$/);
        if (!md5hash) {
            this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'not have md5 hash'));
            return cb();
        }
        var ver = md5hash[1];
        file.contents = new Buffer(ver);
        file.path = file.path.replace(/@(\w+)(\.(?:js|css))$/,function(a,m,n){
            return n+".ver";
        });
        var rlt_path;
        var cwd = process.cwd();
        rlt_path = path.relative(path.join(cwd,build_path), file.path);
        file.path = path.join(cwd, ver_path, rlt_path);
        console.log("version build complate [ %s ]",path.relative(process.cwd(),_p));
        //file relative path
        versions[rlt_path.replace(".ver","")] = ver;
        this.push(file);
        cb();
    },function(){
      var data = mergeFileJson(path.join(ver_path,"manifest.json"),versions);
      gutil.proxy && gutil.proxy(data);
    });
};


function mergeFileJson(file_path,json) {
  fse.createFileSync(file_path);
  var data =fse.readJsonSync(file_path,{throws: false});
  data = data ?  extend(data,json) : json;
  fse.outputJsonSync(file_path,data);
  return data;
}
