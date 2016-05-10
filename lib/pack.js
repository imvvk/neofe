var _ = require("lodash");
var gulp = require("gulp");
var gutil = require("gulp-util");
var uglify = require('gulp-uglify');
var replace = require("gulp-replace");
var minifyCSS = require('gulp-clean-css');
var concat = require('gulp-concat');
var sass = require("gulp-sass");
var md5 = require('gulp-md5');
var chalk = require("chalk");
var htmlmin = require('gulp-htmlmin');

var path = require("path");
var through = require("through2");
var extend = require('extend');
var browerify = require('browserify');
var fse = require('fs-extra');

var loadConfig = require("./load_config.js");
var ver_pipe = require("./ver_pipe");
var compile = require("./js_transform.js").compile;
var multiBrowserify = require("./multi_browserify.js");
var multiMinify = require("./multi_minify.js");

var PluginError = gutil.PluginError;

var gp = require("gulp-print");

var DEFAULT_SASS_OPTION = {
  sourceMap: false,
  sourceMapEmbed: true,
  sourceMapContents: false,
  outputStyle : "compressed"
};


function pack(cwd, needMin) {
  var pj = loadConfig(cwd);
  var exports = pj.exports;
  var buildPath = needMin ? (pj.buildPath ||pj.build_path || "./build") : (pj.packPath || "./pack");
  var verPath = pj.verPath || pj.ver_path || pj.verpath || "./ver";
  var srcBasedir = exports.basedir || ".";

  //clean start
  fse.emptyDirSync(buildPath);
  if (needMin) {
    fse.emptyDirSync(verPath);
  }

  var scripts = exports.scripts || [],
    styles = exports.styles || [],
    htmls = exports.htmls || [];

  scripts = _.isArray(scripts) ? scripts : [ scripts ];
  styles = _.isArray(styles) ? styles : [ styles ];
  htmls = _.isArray(htmls) ? htmls : [ htmls ];

  var total = scripts.length + styles.length;

  var opt = {
    basedir : srcBasedir,
    cwd : cwd,
    buildPath : buildPath,
    verPath : verPath,
    needMin : _.isUndefined(needMin) ? true : needMin,
    insertMainfest : _.isUndefined(exports.insertMainfest) ? false : exports.insertMainfest,
    minify : exports.minify || {}
  };

  console.log(chalk.green((needMin ? "build" : "pack" ) + " task start !"))
  // 增加内部方法 在Gulp ver_pipe 执行完任务后 回调
  // 保证数据的一致性
  gutil.proxy = function () {
    total--;
    if (total === 0) {
      console.log(chalk.green("scripts styles task end"));
      buildHtml();
    }
  };
  scripts.forEach(function(path) {
    transform(path, pj, opt);
  });
  styles.forEach(function(path) {
    transform(path, pj, opt, true);
    //transformStyle(path, pj, opt);
  });

  function buildHtml() {
    htmls.forEach(function(path) {
      transformHtml(path, pj, opt);
    });
  }

}


function transform(src, pj, opt , outCss) {
  var buildPath = opt.buildPath;
  var options = extend({
    insertGlobals: false,
    debug: false
  }, pj.browserify.options);

  if (_.isPlainObject(src)) {
    if (!src.file) {
      console.error("the file property not in the  exports config");
      return;
    } else {
      options.isParent = src.isParent;
      options.parents = src.parents;
      options.expose = src.expose;
      options.containCss = _.isUndefined(src.containCss) ? options.containCss : src.containCss;
      options.outCss = src.outCss;
      src = src.file;
    }
  }
  var p = gulp.src(src, { base: opt.basedir})
          .pipe(multiBrowserify(options, DEFAULT_SASS_OPTION, options.containCss , outCss || options.outCss));

  p.pipe(gp());

  if (opt.needMin) {
    p.pipe(multiMinify(opt.minify.script,opt.minify.style));
  }
  createVersion(p, opt.buildPath , opt.verPath, opt.basedir);
  return p;
}



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
var static_reg = /(?:src|href)\s*=\s*["']?([^"']+)\.(js|css)/ig;

function transformHtml(src, pj, opt) {
  var buildPath = opt.buildPath;
  var mainfest = fse.readJsonSync(path.join(opt.verPath, "mainfest.json"));
  var keys = Object.keys(mainfest);
  var p = gulp.src(src, {
      base: opt.cwd
  });
  //insert mainfest content
  if(opt.insertMainfest) {
    p.pipe(replace(/<\/body>/,function(){
      return '</body><script>var mainfest='+JSON.stringify(mainfest)+'</script>';
    }));
  }
  p.pipe(replace(static_reg, function(src, name, ext) {
      var md5hash, i = 0,
        filename = name + "." + ext;
      for (l = keys.length; i < l; i++) {
        if ((filename.length >= keys[i].length && ~filename.indexOf(keys[i]))
         || (filename.length <= keys[i].length && ~keys[i].indexOf(filename))) {
          var md5hash = mainfest[keys[i]];
          break;
        }
      }
      if (md5hash) {
        return src.substring(0, src.lastIndexOf(".")) + "@" + md5hash + "." + ext;
      }
      return src;
  }));

  if (opt.needMin) {
    p.pipe(htmlmin({collapseWhitespace: true}));
  }

  p.pipe(gulp.dest(opt.buildPath)).end(function(){
    console.log(chalk.green("htmls task end !"));
  });
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

function createVersion(p, buildPath, verPath, basedir) {
  return p.pipe(md5({
      separator: "@"
    }))
    .pipe(gulp.dest(buildPath))
    .pipe(ver_pipe({basedir: basedir}, buildPath, verPath))
    .pipe(gulp.dest(verPath));
}




module.exports = pack;
