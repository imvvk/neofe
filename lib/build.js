
var gulp = require("gulp");
var gutil = require("gulp-util");
var uglify = require('gulp-uglify');
var parsePath = require('parse-filepath');
var path = require("path");
var through = require("through2");
var extend = require('extend');
var sass = require("gulp-sass");
var gbrowserify = require('gulp-browserify'); 
var browerify = require('browserify');
var md5 = require('gulp-md5');
var path = require("path");
var fse = require('fs-extra')
var minifyCSS = require('gulp-minify-css');
var ver_pipe = require("./ver_pipe");
var aliasify = require("aliasify");
var concat = require('gulp-concat')



var PluginError = gutil.PluginError;
var style_reg = /\.s?css$/;
var js_reg = /\.js$/;


var after_bundle =  function(p,build_path,ver_path){
  return p.pipe(md5({separator : "@"}))
    .pipe(gulp.dest(build_path))
    .pipe(ver_pipe())
    .pipe(gulp.dest(ver_path)); 
}

function build(opt){
    var cwd = opt.cwd;
    var pj = require(cwd + "/package.json");
    var exports = pj.browserify.exports;
    var js_exports = exports.js ,
        css_exports = exports.css;

    js_exports.forEach(function(path){
      transform_js(path,pj,cwd)
    });
    css_exports.forEach(function(path){
      transform_css(path,pj,cwd);
    });
}


function transform_css(src_path,pj,cwd){
  var p = gulp.src(src_path,{base:cwd})
              .pipe(sass({outputStyle: 'compressed'}))
              .pipe(minifyCSS())
   
    after_bundle(p,path.join(cwd,"./.build"),path.join(cwd,pj.verpath));

         
}

function transform_js(src_path,pj,cwd) {
  var opt = extend({insertGlobals:false,debug:false},pj.browserify.options);
  var transform = opt.transform || [];
  opt.transform = transform;
  console.log(opt);
  var p = gulp.src(src_path,{base:cwd}).
          pipe(febrowserify(opt,pj))
          .pipe(uglify());
    after_bundle(p,path.join(cwd,"./.build"),path.join(cwd,pj.verpath));

}


function febrowserify (options,pj) {
    return through.obj(function (file, enc, cb) {
        var self = this;
        if (file.isNull()) {
            this.push(file);
            return cb();
        }
        if (file.isStream()) {
            this.emit('error', new gutil.PluginError("fe browerify", 'Streaming not supported'));
            return cb();
        }
        var _p = file.path;
        var bundle = compile(_p,options);
        
        if (pj.browserify.aliasify) {
           bundle.transform(aliasify, pj.browserify.aliasify);
        } 
        self.emit('prebundle', bundle);
        bundle.bundle(function(err, src){
            if(err) {
              self.emit('error', new gutil.PluginError("fe browerify", err.message));
            } else {
              self.emit('postbundle', src);
              file.contents = new Buffer(src);
              self.push(file);
            }
            cb();
        });
    });
};



function compile(path,options) {
    var bundle = browerify({
        noParse: options.noParse || [],
        extensions: options.extensions ||[],
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

    if (options.plugins) {
        var plugins = options.plugins; // in the format options.plugins = [{plugin: plugin, options: options}, {plugin: plugin, options: options}, ... ]
        for(var i = 0; i < plugins.length; i++) {
            var obj = plugins[i];
            bundle.plugin(obj.plugin, obj.options);
        }
    }
    if (Array.isArray(path)) {
        for (var i = 0; i < path.length; i++) {
            if (typeof path[i] === 'object') { // obj spec support; i.e. {"jquery": {options...}}
                var spec = path[i];
                var keys = Object.keys(spec);
                keys.forEach(function (key) {
                    if (spec[key].run) {
                        bundle.add(key, spec[key]);
                    } else {
                        bundle.require(key, spec[key]);
                    }
                })
            } else {
                bundle.require(path[i]);
            }
        }
    } else {
        bundle.add(path);
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
    if (options.events) {
        var events = options.events;
        var keys = Object.keys(events);
        keys.forEach(function (key) {
            bundle.on(key,events[key]);
        }); 
    }
    return bundle;
}




module.exports = build;

