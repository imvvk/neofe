
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
var compile = require("./br_compile.js").compile;
var wrapParentAndChildBundle = require("./pac_bundle.js").wrapParentAndChildBundle;

var PluginError = require('gulp-util').PluginError;

var PLUGIN_NAME = "Multi Browserify Plugin";
/**
 *
 *
 * @params {Object} js_options : browerify bundle options
 * @params {Object} sass_options : sass options
 * @params {Boolean} containCss : the css content which parsed by sass need pack in js file
 *         {true} pack in js ex: module.exports = "{css content}"
 *         {false} content in js file is "" and bundle callback css_text
 * @params {Boolean} outputCss default false
 *         {true} output the file which filename is same as js file  but ext is css in the same path;  
 **/
function multiBrowserify(js_options, sass_options, containCss , outputCss) {
    sass_options = sass_options || {};
    return through.obj({ highWaterMark : process.env.highWaterMark || 8 * 1024 },function(file, enc, next) {
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

        wrapParentAndChildBundle(bundle, js_options, callback);

        function callback(bundle) {
          // build sass if file has require("xxx.scss");
          bundle = wrapBuildSassBundle(bundle, sass_options, containCss);
          bundle.bundle(function(err, js_src, css_src) {
            if (err) {
              self.emit('error', new PluginError(PLUGIN_NAME, err.message));
            } else {
              file.contents = new Buffer(js_src);
              if (!file.path.match(/\.(css|sass|scss)$/i)) {
                self.push(file);
              }
              // append CSS file in the same dir
              if (outputCss && !_.isNil(css_src)) {
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
        }
    });
};

module.exports = multiBrowserify;
