/**
 * detect reqeust url find the realpath file
 *
 */
var _ = require("lodash");
var fs = require('fs');
var mime = require('mime-types');
var url = require("url");
var path = require("path");
var _ = require("lodash");
var micromatch = require("micromatch");

//access xxxxx@md5_version.js or xxxxx@md5_version.css
var map_reg = /@(?:[\/\w\.]+)\.(js|css)$/;
//check file_type  not js or css file could access  some file as  *.scss *.jsx *.coffee

//var file_type = ["css","scss","js","tmpl","jsx","coffee","sass"];

var DEFAULT_FILE_TYPES =  ["css","scss","js","tmpl"];

var log = global.log;

function find_file(cwd) {

  return function(req, res, next) {
    var pkg_json = req.packjson,
    serverOpts = pkg_json.server || {},
    parseFileType = _.isEmpty(serverOpts.parseFileType) ?  DEFAULT_FILE_TYPES :  serverOpts.parseFileType,
    fePrefix = pkg_json["fePrefix"] || pkg_json["fePerfix"], // hack 1.0.0 misspell
    exp  = pkg_json.exports,
    exp_scripts = exp.scripts || [],
    exp_styles = exp.styles || [],
    hadPrefix = false ,
    fePrefixReg ,
    replaceStr;


    if (fePrefix && fePrefix.length) {
      hadPrefix = true;
      fePrefixReg = new RegExp(fePrefix[0]);
      replaceStr = fePrefix[1];
    }
    var file_pathname = req.pathname;

    if (hadPrefix){
      file_pathname = file_pathname.replace(fePrefixReg,replaceStr);
    }
    file_pathname = file_pathname.replace(/^\/+/, "")
      .replace(map_reg, function(all, m) {
        ext_name = m;
        return "." + m;
    });


    var filepath = path.join(req.basedir, file_pathname);
    //非js | css 直接返回
    //host project  prefix{0,1}  path
    //abc.com amy_h5 (prd or src) a/c/d.js
    log.info("request file path [ %s ]", filepath);

    var realpath = find(filepath);
    var parseFileReg = new RegExp("\\.("+parseFileType.join("|")+")$");

    if (realpath && !filepath.match(parseFileReg)) {
      readfile(filepath, res);
      return;
    }

    if (!realpath) {
      res.writeHead(404, {
        'Content-Type': 'text/plain;charset=UTF-8'
      });
      res.write("not filed " + file_pathname);
      res.end();
      return;
    }
    if (!req.query["__single"]){
      var path_relative = path.relative(req.basedir,realpath);
      log.debug("exp_scripts = " , exp_scripts.concat(exp_styles));

      var match_globs = exp_scripts.concat(exp_styles).filter(function(glob){
        if (_.isObject(glob)) {
          if (glob.file) {
            glob = glob.file;
          } else {
            console.error("glob is object but not have file prop :",glob);
            return false;
          }
        }
        glob = glob.replace(/^\.\//,"");
        return matchGlob(path_relative, glob);
      });

      log.debug("match_globs " , match_globs );

      if (!match_globs.length) {
        readfile(filepath, res);
        return;
      } else {
        req.file_config = match_globs[0];
      }
    }
    req.realpath = realpath;
    next();
  }
}

function find(file_path, file_type) {
  file_type = file_type || DEFAULT_FILE_TYPES;

  if (!fs.existsSync(file_path)) {
    var tpath;
    var had_path = file_type.some(function(type) {
      var t = file_path.replace(/.[^.]+$/,"."+type);
      if (fs.existsSync(t)) {
        tpath = t;
        return true;
      }
      return false;
    });
    //console.log("tpath is %s ", tpath);
    return tpath;
  }
  return file_path;
}


function readfile(file_path, res) {
  var type = mime.lookup(file_path);
  fs.readFile(file_path, "binary", function(err, file) {
    if (err) {
      res.writeHead(500, {
        'Content-Type': 'text/html'
      });
      res.write(err.message);
      res.end();
    } else {
      res.writeHead(200, {
        "Content-Type": type,
        "Access-Control-Allow-Origin": "*"
      });
      res.write(file, "binary");
      res.end();
    }
  });
}

function matchGlob(path,glob) {
  if (_.isArray(glob)) {
    var i = 0 , l = glob.length;
    for(; i < l ; i++){
      if (!micromatch.isMatch(path, glob[i])) {
        return false;
      }
    }
    return true;
  } else {
    return micromatch.isMatch(path,glob);
  }
}

module.exports = find_file;
