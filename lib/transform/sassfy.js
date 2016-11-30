var through = require("through2");
var sass = require("node-sass-china");
var extend = require('util')._extend;
var fs = require("fs");
var jsescape = require('js-string-escape');
var path = require("path");
var chalk = require("chalk");

var file_regx = /\.(css|scss|sass)$/i;
var require_regex = /(?:(?:var|const)\s*(.*?)\s*=\s*)?require\(\s*['"]([^'"]+)['"](?:, ['"]([^'"]+)['"])?\s*\);?/g;

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

/**
 * 
 * file  
 * options  必须含有 store {array};
 * 
 * @returns {Stream}
 */

var sassfy = function (file, options) {
    var store = options.store;
    var containCss = typeof options.containCss === "undefined"  ? false : options.containCss;
    delete options.containCss;
    if (!Array.isArray(store)) {
      console.error("sassfy options store must exist and is array");
    }
    //排序
    console.log("file===========", file);
    var i = store.length;
    if (!file_regx.test(file)) {
      return through.obj(function(row, enc, next){
        this.push(row);
        next();
      });
    }
    var includePath = path.dirname(file);
    var buffs = [];

    return through.obj({ highWaterMark : process.env.highWaterMark || 8 * 1024 }, function(row, enc, next) {
      var content = row.toString();
      if (require_regex.test(content)) {
        this.push(row);
        return next();
      }
      buffs.push(row);
      return next();
    }, function (cb) {
      var content = Buffer.concat(buffs);
      if (!content.length) {
        return cb();
      }
      try {
        var sass_options = mixSassConfig(options);
        sass_options.includePaths = [includePath];
        sass_options.data = content.toString();
        var css_rs = sass.renderSync(sass_options);
        if (containCss) {
          this.push("module.exports=\""+jsescape(css_rs.css.toString())+"\"");
        } else {
          store[i] = css_rs.css.toString();
        }
      } catch (error) {
        console.error(chalk.red("sass parse error"));
        console.error(error.message);
        console.error("error file:"+file+" error line :" +error.line, "error column :"+ error.column , "error code :"+error.code );
      }
      cb();
    });
}


module.exports = sassfy;


