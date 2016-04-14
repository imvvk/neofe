var gutil = require('gulp-util');
var through = require('through2');
var parsePath = require('path-parse');
var fse = require('fs-extra')
var path = require("path");
var extend = require("extend");
var PLUGIN_NAME = "ver_pipe";

module.exports = function (options,build_path,ver_path) {
    var versions = {};
    return through.obj(function (file, enc, cb) {
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
        if(options.replace) {
            file.path = file.path.replace(new RegExp(options.replace.reg),options.replace.str);
        }
        console.log("version build complate [ %s ]",_p);
        //file relative path
        var file_rel_path = file.path.replace(build_path,"").replace(".ver","");
        versions[file_rel_path] = ver;
        this.push(file);
        cb();
    },function(){
      var data = mergeFileJson(path.join(ver_path,"mainfest.json"),versions);
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
