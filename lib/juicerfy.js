/**
 * Juicer Tpl transform  for Browserify
 *
 **/


"use strict";

var through = require("through2");
var juicer = require("juicer");

module.exports = function (file) {
    if (!/\.tmpl$/i.test(file)) {
        return through();
    }
    return through(function (buf, enc, next) {
        try {
          var result = juicer.compile( buf.toString('utf8'), {type:'string'})._render.toString().replace(/^function anonymous[^{]*?{([\s\S]*?)}$/igm, function($, fn_body) {
              return 'function(_, _method) {_method = juicer.options._method;' + fn_body + '}';
          });
          result = "var juicer = require(\"juicer\");\n\nmodule.exports = " + result + ";";
          this.push(result);
        } catch (e) {
          console.error(e.message);
          console.error("file is:",file)
        }
        next();
    });
};
