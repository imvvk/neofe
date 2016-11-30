/**
 * analayz reqeust url  and get the physical file path
 * 
 */
var _ = require("lodash");
var fs = require('fs');
var mime = require('mime-types');
var url = require("url");
var path = require("path");
var micromatch = require("micromatch");

var serverProjectConfig = require("../server_project_config.js");

var DEFAULT_FILE_TYPES =  ["css","scss","js"];
var map_reg = /@(?:[\/\w\.]+)\.(js|css)$/;

var log = global.log;

module.exports = locate;

function locate (cwd, options) {

  return function (req, res, next) {
    var key = req.key;
    var pkg_json = serverProjectConfig.get(key),
      parseFileType = serverProjectConfig.getParseFileType(key),
      exportsScripts = serverProjectConfig.getExportsScripts(key),
      exportsStyles = serverProjectConfig.getExportsStyles(key);


    var fePrefix = pkg_json["fePrefix"],
        fePrefixReg,
        replaceStr;

    var filepath = "";

    if (fePrefix && fePrefix.length) {
      fePrefixReg = new RegExp(fePrefix[0]);
      replaceStr = fePrefix[1];
      filepath = path.join(req.basedir, req.pathname.replace(fePrefixReg,replaceStr));
    } else if(req.key) {
      filepath = path.join(req.basedir, req.pathname.replace(new RegExp("^/?"+req.key),""));
    } else {
      filepath = path.join(req.basedir, req.pathname);
    }

    filepath = filepath.replace(map_reg, function(all, m) {
        ext_name = m;
        return "." + m;
    });

    //非js | css 直接返回
    log.debug("filepath is %s" , filepath );
    log.info("request file %s ", path.relative(process.cwd(),filepath));

    var realpath = getFilePath(filepath, parseFileType);
    var parseFileReg = new RegExp("\\.("+parseFileType.join("|")+")$");

    log.debug("realpath is %s" , realpath );

    if (realpath && !filepath.match(parseFileReg)) {
      readfile(filepath, res);
      return;
    }

    if (!realpath) {
      res.writeHead(404, {
        'Content-Type': 'text/plain;charset=UTF-8'
      });
      res.write("not filed " + filepath);
      res.end();
      return;
    }
    var path_relative = path.relative(req.basedir,realpath);
    var allow_files = exportsScripts.concat(exportsStyles);
    var match_globs, glob;
    for (var i=0, l = allow_files.length; i < l ; i++) {
      glob = allow_files[i];
      if (_.isPlainObject(glob)) {
        if (glob.file) {
          glob = glob.file;
        } else {
          log.error("glob is object but not have file prop :",glob);
          continue;
        }
      }
      glob = glob.replace(/^\.\//,"");
      match_globs = matchGlob(path_relative, glob);
      if (match_globs) {
        break;
      }
    } 

    log.debug("match_globs " , match_globs );

    if (!match_globs) {
      readfile(filepath, res);
      return;
    } 
    req.file_config = glob;
    req.realpath = realpath;
    next();
  }

}


function getFilePath(file_path, file_type) {
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

