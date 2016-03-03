var gutil = require('gulp-util');
var through = require('through2');
var parsePath = require('path-parse');;
var path = require("path");
var PLUGIN_NAME = "ver_pipe";

module.exports = function (options) {

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
        file.contents = new Buffer(md5hash[1]);
        file.path = file.path.replace(/@(\w+)(\.(?:js|css))$/,function(a,m,n){
            return n+".ver";
        });
        if(options.replace) {
            file.path = file.path.replace(new RegExp(options.replace.reg),options.replace.str);
        }
        console.log("version====",_p);
        this.push(file);
        cb();
    });
};
