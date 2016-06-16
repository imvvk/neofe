var _ = require("lodash");
var gulp = require("gulp");
var gutil = require("gulp-util");
//var replace = require("gulp-replace");
var md5 = require('gulp-md5');
var chalk = require("chalk");
var htmlmin = require('gulp-htmlmin');
var zip = require("gulp-zip");

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
var replace = require("./replace_version.js");

var PluginError = gutil.PluginError;

var gp = require("gulp-print");

var DEFAULT_SASS_OPTION = {
  sourceMap: false,
  sourceMapEmbed: true,
  sourceMapContents: false,
  outputStyle : "compressed"
};


function pack(cwd, needMin , task) {
  var pj = loadConfig(cwd);
  var exports = pj.exports;
  var buildPath = needMin ? (pj.buildPath ||pj.build_path || "./build") : (pj.packPath || "./pack");
  var verPath = pj.verPath || pj.ver_path || pj.verpath || "./ver";
  var srcBasedir = exports.basedir || ".";
  var buildHtmlPath = pj.buildHtmlPath || buildPath;
  var buildSourcePath = pj.buildSourcePath || buildPath;
  var htmlBaseDir = exports.htmlBaseDir || cwd;
  var sourceBaseDir = exports.sourceBaseDir || cwd;

  var scripts = exports.scripts || [],
    styles = exports.styles || [],
    htmls = exports.htmls || [],
    sources = exports.sources || [];

  scripts = _.isArray(scripts) ? scripts : [ scripts ];
  styles = _.isArray(styles) ? styles : [ styles ];
  htmls = _.isArray(htmls) ? htmls : [ htmls ];
  sources = _.isArray(sources) ? sources : [ sources ];

  var total = scripts.length + styles.length;

  var opt = {
    basedir : srcBasedir,
    htmlBaseDir : exports.htmlBaseDir || cwd,
    sourceBaseDir : sourceBaseDir, 
    staticReg : exports.staticReg,
    cwd : cwd,
    buildPath : buildPath,
    buildHtmlPath : buildHtmlPath,
    buildSourcePath : buildSourcePath,
    verPath : verPath,
    needMin : _.isUndefined(needMin) ? true : needMin,
    insertMainfest : _.isUndefined(exports.insertMainfest) ? false : exports.insertMainfest,
    minify : exports.minify || {}
  };


  if (task === "html") {
    buildHtml();
    return;
  }

  //clean start
  fse.emptyDirSync(buildPath);
  if (needMin) {
    fse.emptyDirSync(verPath);
  }


  
  console.log(chalk.green((needMin ? "build" : "pack" ) + " task start !"))
  // 增加内部方法 在Gulp ver_pipe 执行完任务后 回调
  // 保证数据的一致性
  gutil.proxy = function () {
    total--;
    if (total === 0) {
      console.log(chalk.green("scripts styles task end"));
      if (htmls.length) {
        buildHtml(end);
      } else {
        end();
      }
    }
  };
  scripts.forEach(function(path) {
    transform(path, pj, opt);
  });
  styles.forEach(function(path) {
    transform(path, pj, opt, true);
    //transformStyle(path, pj, opt);
  });

  if (sources.length) {
    transformSource(sources, pj, opt);
  }

  
  function buildHtml(cb) {
    var len = htmls.length;
    console.log(chalk.green("htmls task start !"))
    htmls.forEach(function(path) {
      transformHtml(path, pj, opt,function(){
        len--;
        if (len === 0) {
          console.log(chalk.green("htmls task end !"));
          cb && cb();
        }
      });
    });
  }

  function end() {
    if (exports.zip) {
      gulp.src(buildPath+"/**",{base:buildPath}).pipe(zip("pkg.zip")).pipe(gulp.dest(buildPath)).on("end",endlog);
      return;
    }
    endlog();
  }

  function endlog(){
    console.log(chalk.green((needMin ? "build" : "pack" ) + " task end !"));
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

function transformHtml(src, pj, opt, cb) {
  var buildPath = opt.buildHtmlPath;
  var staticReg = opt.staticReg ?  new RegExp(opt.staticReg) : static_reg;
  var mainfest = fse.readJsonSync(path.join(opt.verPath, "mainfest.json"));
  var keys = Object.keys(mainfest);
  var p = gulp.src(src, {
      base: opt.htmlBaseDir || opt.cwd
  });
  //insert mainfest content
  if(opt.insertMainfest) {
    p.pipe(replace(/<\/body>/,function(){
      return '</body><script>var mainfest='+JSON.stringify(mainfest)+'</script>';
    }));
  }


  p.pipe(replace(staticReg, function(src, name, ext) {
      var md5hash, i = 0,
        filename = name + "." + ext ,
        origin_file = filename;
       
     
      if (isRelativePath(filename)) {
        filename = path.relative(this.file.base, path.join(path.dirname(this.file.path), filename));
      }
      for (l = keys.length; i < l; i++) {
        if ((filename.length >= keys[i].length && ~filename.indexOf(keys[i]))
         || (filename.length <= keys[i].length && ~keys[i].indexOf(filename))) {
          md5hash = mainfest[keys[i]];
          break;
        }
      }
      if (md5hash) {
        console.log(chalk.red("replace version file is "+filename + " key is " + keys[i]));
        return src.substring(0, src.lastIndexOf(".")) + "@" + md5hash + "." + ext;
      }
      return src;
  })).pipe(gp());
  


  //需要htmlmin
  if (opt.needMin && opt.minify.html) {
    p.pipe(htmlmin(opt.minify.html));
  }
  p.pipe(gulp.dest(buildPath)).on("end",function(){
    cb && cb();
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

function transformSource(src, pj, opt, cb) {
  console.log("");
  console.log(chalk.green("source task start"));
  var buildPath = opt.buildSourcePath;
  var p = gulp.src(src, {
      base: opt.sourceBaseDir || opt.cwd
  })
  p.pipe(gp()).pipe(gulp.dest(buildPath)).on("end", function() {
    console.log(chalk.green("source task end"));
  });

}


function isRelativePath(pa) {
  if (pa.match(/^http/)) {
    return false;
  }
  return !path.isAbsolute(pa);
}



module.exports = pack;
