'use strict';

var gutil = require('gulp-util');
var through = require('through2');
var parsePath = require('path-parse');
var fse = require('fs-extra')
var path = require("path");
var extend = require("extend");
var PLUGIN_NAME = "repalce_version";

var Log = require("log");
var log = new Log("info");
module.exports = function (search, replacement, options) {
    var versions = {};
    return through.obj({highWaterMark: 1024} , function (file, enc, callback) {
      var me = this;
      if (file.isNull()) {
        return callback(null, file);
      }
      function doReplace() {
        if (file.isStream()) {
          me.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'));
          return callback();
        }

        if (file.isBuffer()) {
          if (search instanceof RegExp) {
            file.contents = new Buffer(String(file.contents).replace(search, replacement));
          } else {
            var chunks = String(file.contents).split(search);

            var result;
            if (typeof replacement === 'function') {
              // Start with the first chunk already in the result
              // Replacements will be added thereafter
              // This is done to avoid checking the value of i in the loop
              result = [ chunks[0] ];

              // The replacement function should be called once for each match
              for (var i = 1; i < chunks.length; i++) {
                // Add the replacement value
                result.push(replacement(search));
                // Add the next chunk
                result.push(chunks[i]);
              }

              result = result.join('');
            }
            else {
              result = chunks.join(replacement);
            }

            file.contents = new Buffer(result);
          }
          return callback(null, file);
        }

        callback(null, file);
      }

      if (options && options.skipBinary) {
        istextorbinary.isText(file.path, file.contents, function(err, result) {
          if (err) {
            return callback(err, file);
          }

          if (!result) {
            callback(null, file);
          } else {
            doReplace();
          }
        });

        return;
      }

      doReplace();

    });


}

