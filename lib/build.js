var _ = require("lodash");
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
var multiBrowserify = require("./multi_browserify.js");
var multiMinify = require("./multi_minify.js");

var PluginError = gutil.PluginError;
var style_reg = /\.s?css$/;
var js_reg = /\.js$/;

var gp = require("gulp-print");




function build(cwd) {
  var pj = require(cwd + "/package.json");
  var exports = pj.browserify.exports;
  var build_path = pj.build_path || "./build";
  var verpath = pj.verpath || "./ver";
  var verpath = path.join(cwd, verpath);
  //clean start
  fse.emptyDirSync(build_path);
  fse.emptyDirSync(verpath);

  var js_exports = exports.scripts || [],
    css_exports = exports.styles || [],
    html_exports = exports.htmls || [];

  var total = js_exports.length + css_exports.length;

  // 增加内部方法 在Gulp ver_pipe 执行完任务后 回调
  // 保证数据的一致性
  gutil.proxy = function start_build_html() {
    total--;
    if (total === 0) {
      build_html();
    }
  };

  js_exports.forEach(function(path) {
    transform_js(path, pj, cwd, build_path, verpath);
  });

  css_exports.forEach(function(path) {
    transform_css(path, pj, cwd, build_path, verpath);
  });

  function build_html() {
    html_exports.forEach(function(path) {
      transform_html(path, pj, cwd, build_path, verpath);
    });
  }

}


function transform_css(src_path, pj, cwd, build_path , verpath) {
  var p = gulp.src(src_path, {
      base: cwd
    })
    .pipe(sass({
      outputStyle: 'compressed'
    }))
    .pipe(minifyCSS());

  after_bundle(p, path.join(cwd, build_path), path.join(cwd, verpath), pj);
  return p;

}

function transform_js(src_path, pj, cwd, build_path, verpath) {
  var opt = extend({
    insertGlobals: false,
    debug: false
  }, pj.browserify.options);

  opt.aliasify = (pj.browserify || {}).aliasify;
  if (_.isPlainObject(src_path)) {
    if (!src_path.file) {
      console.error("the file property not in the  exports config");
      return;
    } else {
      opt.isParent = src_path.isParent;
      opt.parents = src_path.parents;
      src_path = src_path.file;
    }
  } 
  var p = gulp.src(src_path, { base: cwd })
          .pipe(gp())
          .pipe(multiBrowserify(opt, {}))
          //.pipe(multiMinify());

  after_bundle(p, path.join(cwd, build_path), path.join(cwd, verpath), pj);

  return p;
}


var static_reg = /(?:src|href)=(.+)\.(js|css)/ig;

/**
 * replace script src which in html to product address
 * exp :  replace xxx.js to xxx@{version}.js;
 * 
 * @param src_path html file path
 * @param pj packjson
 * @param cwd the cwd of run cmd
 * @param build_path the dir of builded html file
 * @param ver_path version file path 
 * 
 * @return glup.pipe()
 **/

function transform_html(src_path, pj, cwd, build_path, ver_path) {
  var mainfest = fse.readJsonSync(path.join(ver_path, "mainfest.json"));
  var keys = Object.keys(mainfest);
  return gulp.src(src_path, {
      base: cwd
    })
    .pipe(replace(static_reg, function(src, name, ext) {
      var md5hash, i = 0,
        filename = name + "." + ext;
      for (l = keys.length; i < l; i++) {
        if (~filename.indexOf(keys[i])) {
          var md5hash = mainfest[keys[i]];
          break;
        }
      }
      if (md5hash) {
        return src.substring(0, src.lastIndexOf(".")) + "@" + md5hash + "." + ext;
      }
      return src;
    }))
    .pipe(gulp.dest(build_path));
}


/**
 * move build file to dest and create file version
 *
 * @param p gulp.pipe
 * @param build_path  build file dir
 * @param ver_path  version file dir
 * @param pj package.json
 * 
 * @return gulp.pipe()
 **/

function after_bundle(p, build_path, ver_path, pj) {
  return p.pipe(md5({
      separator: "@"
    }))
    .pipe(gulp.dest(build_path))
    .pipe(ver_pipe(pj.ver_options || {}, build_path, ver_path))
    .pipe(gulp.dest(ver_path));
}




module.exports = build;
