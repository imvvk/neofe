/***
 * Juicer Tpl Gulp Plugin
 *
 ***/

var gutil = require('gulp-util');
var through = require('through2');
var juicer = require('juicer');
var basename = require('path').basename;
var PLUGIN_NAME = "juicer tpl";

module.exports = function (options) {
    return through.obj(function (file, enc, cb) {

        if (file.isNull()) {
            this.push(file);
            return cb();
        }
        if (file.isStream()) {
            this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'));
            return cb();
        }
        var opt =  options || {};
        var output = [];

        if (!opt.simple) {
            if (opt.amd) {
                output.push('define([\'' + opt.juicerPath + 'juicer\'], function(juicer) {\n');
            } else {
                output.push('(function() {\n');
            }

            output.push('  var template = juicer.template, templates = juicer.templates = juicer.templates || {};\n');
        }
        //var content = juicer.compile(file.contents.toString(),{type:"string"});
        
        var result = juicer.compile(file.contents.toString(), {type:'string'})._render.toString().replace(/^function anonymous[^{]*?{([\s\S]*?)}$/igm, function($, fn_body) {
            return 'function(_, _method) {_method = juicer.options._method;' + fn_body + '}';
        });

        if (opt.simple) {
            output.push(result + '\n');
        } else {
            output.push('var tpl = templates[\'' + basename(file.path) + '\'] = ' + result + ';\n');
            output.push('})();\n');
            output.push('module.exports = juicer.templates[\'' + basename(file.path) + '\'];');
        }
        
        file.contents = new Buffer(output.join(""));

        this.push(file);

        cb();
    });
};
