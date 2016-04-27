
/**
 * gulp plugin
 * could bundle js file which content contain require("./xxxx.css")
 * export two file  xxx.js xxx.css
 *
 */

var _ = require("lodash");
var through = require("through2");
var File = require("vinyl");
var wrapBuildSassBundle = require("./browserify_sass.js");
var compile = require("./js_transform.js").compile;
var PluginError = require('gulp-util').PluginError;

var PLUGIN_NAME = "Multi Browserify Plugin";

function multiBrowserify(js_options, sass_options) {
    sass_options = sass_options || {};
    return through.obj(function(file, enc, next) {
        var self = this;
        if (file.isNull()) {
            this.push(file);
            return cb();
        }
        if (file.isStream()) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Streaming not supported'));
            return cb();
        }
        var _cwd = file.cwd;
        var _p = file.path;
        var _base = file.base;

        var bundle = compile(_p, js_options);
        // build sass if file has require("xxx.scss");
        wrapBuildSassBundle(bundle, sass_options);

        bundle.bundle(function(err, js_src, css_src) {
            if (err) {
              self.emit('error', new PluginError(PLUGIN_NAME, err.message));
            } else {
              file.contents = new Buffer(js_src);
              self.push(file);
              // append CSS file in the same dir
              if (!_.isNil(css_src)) {
                var css_file = file.clone({
                  deep : false,
                  contents : false
                });
                //set base dest is ok
                css_file.cwd = _cwd;
                css_file.path =  _p.replace(/\.[^\.]+$/,".css");
                css_file.base = _base;
                css_file.contents =  new Buffer(css_src);

                self.push(css_file);
              }
            }
            next();
        });
    });
};

module.exports = multiBrowserify;
