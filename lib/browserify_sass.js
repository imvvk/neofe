var through = require("through2");
var sass = require("node-sass");
var extend = require('util')._extend;
var fs = require("fs");

var file_regx = /\.(s?c)|(sa)ss$/i;

var mixSassConfig = function(config) {
  var options = extend({
    sourceComments: false,
    sourceMap: true,
    sourceMapEmbed: true,
    sourceMapContents: true,
    base64Encode: true,
    outputStyle: "expanded",
    importer: null
  }, config || {});

  options.includePaths = extend([], (config ? config.includePaths : []) || []);
  return options;:
}

function wrapBuildSassBundle(b, options) {
  var rs = [];
  b.transform(function(file) {
    if (!file_regx.test(file)) {
      return through();
    }
    return through.obj(function(row, enc, next) {
      var sass_options = mixSassConfig(options);
      sass_options.data = row.toString();
      var css_rs = sass.renderSync(sass_options);
      rs.push(css_rs.css.toString());
      return next();
    });
  });
  var bundle_fn = b.bundle;
  b.bundle = function(cb) {
    return bundle_fn.call(b, function(err, js_text) {
      var css_text;
      if (rs.length) {
        css_text = rs.join("\n");
      }
      cb && cb(err, js_text, css_text);
    });
  }
  return b;
}

function nothingPush() {
  return through.obj(function(row, enc, next) {
    return next();
  });
}

module.exports = wrapBuildSassBundle;
