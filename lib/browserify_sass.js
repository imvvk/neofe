var through = require("through2");
var sass = require("node-sass-china");
var extend = require('util')._extend;
var fs = require("fs");
var jsescape = require('js-string-escape');
var path = require("path");
var chalk = require("chalk");

var file_regx = /\.(css|scss|sass)$/i;
var require_regex = /(?:(?:var|const)\s*(.*?)\s*=\s*)?require\(['"]([^'"]+)['"](?:, ['"]([^'"]+)['"])?\);?/g;

var mixSassConfig = function(config) {
  var options = extend({
    sourceComments: false,
    sourceMap: true,
    sourceMapEmbed: true,
    sourceMapContents: true,
    outputStyle: "expanded",
  }, config || {});

  options.includePaths = extend([], (config ? config.includePaths : []) || []);
  return options;
}

function wrapBuildSassBundle(b, options, containCss) {
  var rs = [];

  b.transform(function(file) {
    if (!file_regx.test(file)) {
      return through.obj(function(row, enc, next){
        this.push(row);
        next();
      });
    }
    var includePath = path.dirname(file);
    return through.obj(function(row, enc, next) {
      var content = row.toString();
      if (require_regex.test(content)) {
        this.push(row);
        return next();
      }
      try {
        var sass_options = mixSassConfig(options);
        sass_options.includePaths = [includePath];
        sass_options.data = row.toString();
        var css_rs = sass.renderSync(sass_options);
        if (containCss) {
          this.push("module.exports=\""+jsescape(css_rs.css.toString())+"\"");
        } else {
          rs.push(css_rs.css.toString());
          this.push("");
        }
      } catch (error) {
        console.error(chalk.red("sass parse error"));
        console.error(error.message);
        if (error.file) {
          console.error("error file:"+error.file+"error line :" +error.line, "error column :"+ error.column , "error code :"+error.code );
        }
      }
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
