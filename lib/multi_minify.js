/***
 *
 *	minify css in js
 *  source from gulp-uglify and gulp-clean-css
 *
 ***/


var through = require("through2");
var uglify = require('uglify-js');
var CleanCss = require("clean-css");
var applySourceMap = require('vinyl-sourcemaps-apply');
var saveLicense = require('uglify-save-license');
var ngAnnotate = require('ng-annotate');

var PluginError = require('gulp-util').PluginError;
var extend = require("extend");
var path = require("path");

var PLUGIN_NAME = "Multi Minify Plugin";

var reSourceMapComment = /\n\/\/# sourceMappingURL=.+?$/;

module.exports = function minify (js_options, css_options) {
  js_options = js_options || {};
  css_options = css_options || {};

  return through.obj( { highWaterMark : process.env.highWaterMark || 8 * 1024 },  function (file, enc, next) {
    var self = this;
    if (file.isNull()) {
        this.push(file);
        return cb();
    }
    if (file.isStream()) {
        this.emit('error', new PluginError(PLUGIN_NAME, 'Streaming not supported'));
        return cb();
    }

    var path = file.path;
    var err ;

    if (isJs(path)) {
      err = minJs(file, js_options);
    } else if (isCss(path)) {
      err = minCss(file, css_options);
    }
    if (err) {
      this.emit('error',err);
    } else {
      this.push(file);
    }
    next();

  });

}

function isJs(path){
  return /\.js$/i.test(path);
}

function isCss(path){
  return /\.css$/i.test(path);
}

function minJs(file,options) {

  var opts = extend({}, options, {
    fromString: true,
    output: {}
  });


  if (options.preserveComments === 'all') {
    opts.output.comments = true;
  } else if (options.preserveComments === 'some') {
    // preserve comments with directives or that start with a bang (!)
    opts.output.comments = /^!|@preserve|@license|@cc_on/i;
  } else if (options.preserveComments === 'license') {
    opts.output.comments = saveLicense;
  } else if (typeof options.preserveComments === 'function') {
    opts.output.comments = options.preserveComments;
  }

  if (file.sourceMap) {
      opts.outSourceMap = file.relative;
  }

  var originalContents = String(file.contents);

  return trycatch(function () {
    var js = uglify.minify(originalContents, opts);
    js.code = js.code.replace(reSourceMapComment, '');
    file.contents = new Buffer(js.code);
    /**
    if (file.sourceMap) {
      var sourceMap = JSON.parse(js.map);
      sourceMap.sources = [file.relative];
      sourceMap.sourcesContent = [originalContents];
      applySourceMap(file, sourceMap);
    }
    **/

  }, createError.bind(null, file));

}

function minCss(file,options) {
  return trycatch(function () {
    var css = new CleanCss(options).minify(String(file.contents));
    file.contents = new Buffer(css.styles);
    /**
    if (css.sourceMap) {
      var map = JSON.parse(css.sourceMap);
      map.file = path.relative(file.base, file.path);
      map.sources = map.sources.map(function (src) {
        if (/^(https?:)?\/\//.test(src)) {
          return src;
        }
        return path.relative(file.base, src);
      });
      applySourceMap(file, map);
    }
    ***/

  }, createError.bind(null, file));
}

function trycatch(fn, handle) {
  try {
    return fn();
  } catch (e) {
    return handle(e);
  }
}


function createError(file, err) {
  if (typeof err === 'string') {
    return new PluginError(PLUGIN_NAME, file.path + ': ' + err, {
      fileName: file.path,
      showStack: false
    });
  }

  var msg = err.message || err.msg || 'unspecified error';

  return new PluginError(PLUGIN_NAME, file.path + ': ' + msg);
}
