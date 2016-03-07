
var gulp = require("gulp");
var gutil = require("gulp-util");
var uglify = require('gulp-uglify');
var replace = require("gulp-replace");
var minifyCSS = require('gulp-minify-css');
var concat = require('gulp-concat');
var sass = require("gulp-sass");
var md5 = require('gulp-md5');

var path = require("path");
var through = require("through2");
var extend = require('extend');
var browerify = require('browserify');
var fse = require('fs-extra')
var ver_pipe = require("./ver_pipe");

var compile = require("./js_transform.js").compile;

var PluginError = gutil.PluginError;
var style_reg = /\.s?css$/;
var js_reg = /\.js$/;




function build(cwd){
    var pj = require(cwd + "/package.json");
    var exports = pj.browserify.exports;
    var build_path = pj.build_path || "./build";
    var verpath = path.join(cwd,pj.verpath);
    //clean start
    fse.emptyDirSync(build_path);
    fse.emptyDirSync(verpath);

    var js_exports = exports.scripts || [] ,
        css_exports = exports.styles || [],
        html_exports = exports.html || [];

    var total = js_exports.length + css_exports.length ;

    gutil.proxy = function start_build_html(){
      total --;
      if (total === 0) {
        build_html();
      }
    };

    js_exports.forEach(function(path){
      transform_js(path,pj,cwd , build_path)
      //.on("end",start_build_html);
    });

    css_exports.forEach(function(path){
      transform_css(path,pj,cwd , build_path)
      //.on("end",start_build_html);
    });
    function build_html(){
      html_exports.forEach(function(path){
        transform_html(path,pj,cwd,build_path,verpath);
      });
    }

}


function transform_css(src_path,pj,cwd , build_path){
  var p = gulp.src(src_path,{base:cwd})
              .pipe(sass({outputStyle: 'compressed'}))
              .pipe(minifyCSS())

   after_bundle(p,path.join(cwd,build_path),path.join(cwd,pj.verpath),pj);
   return p;

}

function transform_js(src_path,pj,cwd , build_path) {
  var opt = extend({insertGlobals:false,debug:false},pj.browserify.options);
  opt.aliasify = (pj.browserify || {}).aliasify;

  var p = gulp.src(src_path,{base:cwd}).
          pipe(febrowserify(opt,pj))
          .pipe(uglify());

   after_bundle(p,path.join(cwd,build_path),path.join(cwd,pj.verpath),pj);
   return p;
}


var static_reg = /(?:src|href)=(.+)\.(js|css)/ig;
function transform_html(src_path,pj,cwd,build_path,ver_path){
  var mainfest = fse.readJsonSync(path.join(ver_path,"mainfest.json"));
  var keys = Object.keys(mainfest);
  return gulp.src(src_path,{base:cwd})
  .pipe(replace(static_reg,function(src,name,ext){
    var md5hash , i=0 ,filename = name+"."+ext;
    for( l = keys.length; i < l ; i++){
      if (~filename.indexOf(keys[i])){
        var md5hash  = mainfest[keys[i]];
        break;
      }
    }
    if (md5hash) {
      keys.splice(i,1);
      return src.substring(0,src.lastIndexOf("."))+"@"+md5hash+"."+ext;
    }
    return src;
  }))
  .pipe(gulp.dest(build_path));
}



function after_bundle(p,build_path,ver_path,pj){
  return p.pipe(md5({separator : "@"}))
    .pipe(gulp.dest(build_path))
    .pipe(ver_pipe(pj.ver_options,build_path,ver_path))
    .pipe(gulp.dest(ver_path));
}

function febrowserify (options) {
    return through.obj(function (file, enc, cb) {
        var self = this;
        if (file.isNull()) {
            this.push(file);
            return cb();
        }
        if (file.isStream()) {
            this.emit('error', new gutil.PluginError("fe browserify", 'Streaming not supported'));
            return cb();
        }
        var _p = file.path;
        var bundle = compile(_p,options);

        bundle.bundle(function(err, src){
            if(err) {
              self.emit('error', new gutil.PluginError("fe browserify", err.message));
            } else {
              file.contents = new Buffer(src);
              self.push(file);
            }
            cb();
        });
    });
};


module.exports = build;
