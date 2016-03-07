/**
 * detect reqeust url find the realpath file
 *
 */

var fs = require('fs');
var mime = require('mime-types');
var url = require("url");
var path = require("path");

//access xxxxx@md5_version.js or xxxxx@md5_version.css
var map_reg = /@(?:[\/\w\.]+)\.(js|css)$/;
var js_css_reg = /\.(js|css)$/;
//check file_type  not js or css file could access  some file as  *.scss *.jsx *.coffee
var file_type = ["scss","jsx","coffee"];

function find_file(cwd) {


  return function(req, res, next) {
    var pkg_json = req.packjson;
    var fePerfix = pkg_json["fePerfix"] ,
    hadPerfix = false ,
    fePerfixReg , replaceStr;
    if (fePerfix && fePerfix.length) {
      hadPerfix = true;
      fePerfixReg = new RegExp(fePerfix[0]);
      replaceStr = fePerfix[1];
    }
    var file_pathname = req.pathname;
    if (hadPerfix){
      file_pathname = file_pathname.replace(fePerfixReg,replaceStr);
    }

    file_pathname = file_pathname.replace(/^\/+/, "")
      .replace(map_reg, function(all, m) {
        return "." + m;
    });

    var filepath = path.join(req.basedir, file_pathname);
    //非js | css 直接返回
    //host project  prefix{0,1}  path
    //abc.com amy_h5 (prd or src) a/c/d.js
    console.log("filepath===", filepath);

    var realpath = find(filepath);
    if (realpath && !filepath.match(js_css_reg)) {
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
    req.realpath = realpath;
    next();
  }
}

function find(file_path) {
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

module.exports = find_file;
