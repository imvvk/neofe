var gulp = require("gulp");
var connect = require("gulp-connect");
var parsePath = require('parse-filepath');
var path = require("path");
var url = require("url");
var sass = require("node-sass");
var fs = require('fs');
var mime = require('mime-types');
var posix = require("posix");
var browserify = require("./browserify.js"); 

//var juicerfy = require("./juicerfy.js");


var js_css_reg = /\.(js|css)$/;
var map_reg = /@(?:[\/\w\.]+)\.(js|css)$/;
//var file_type = ["js","css","scss","jsx","tmpl","mustache"];
var file_type = ["js","css","scss"];
//ulimit  
posix.setrlimit('nofile', { soft: 10000, hard: 10000 });

var findfile = function(file_path){  
    if (!fs.existsSync(file_path)) {
        var p_obj = parsePath(file_path);
        var dirname = p_obj.dirname , 
            name = p_obj.name, 
            ext = p_obj.extname;
        var tpath = null;
        var had_path = file_type.some(function(type){
            var t = path.join(dirname , name +"."+type );
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

var readfile = function(file_path,res){
    var type = mime.lookup(file_path);
    fs.readFile(file_path, "binary", function (err, file) {
        if (err) {
            res.writeHead(500, {
                'Content-Type': 'text/html'
            });
            res.write(err.message);
            res.end();
        } else {
            res.writeHead(200, {
                "Content-Type": type,
                "Access-Control-Allow-Origin" : "*"
            });
            res.write(file, "binary");
            res.end();
        }
    }); 
}

var file_parse = function(pkg_json) {
  var fePerfix = pkg_json["fe-perfiex"] || ["^/prd/" , "/fe/src/"]; 
  var fePrefixReg = new RegExp(fePerfix[0]);
  return function (req,res,next){
      var rurl = req.url;
      var url_obj = url.parse(rurl); 
      var pathname = url_obj.pathname;
      var file_pathname = pathname
                  .replace(fePrefixReg,fePerfix[1])
                  .replace(/^\/+/,"")
                  .replace(map_reg,function(all,m){
                      return "."+m;
                  });

      //var filename = file_pathname.substring(file_pathname.lastIndexOf("/")+1,file_pathname.length);
      var filepath =path.join(process.cwd(), file_pathname) ;           
      //非js | css 直接返回
      console.log("file_pathname===",file_pathname);
      req.file_pathname = file_pathname;
      var realpath = findfile(filepath);
      if (realpath && !filepath.match(js_css_reg)) {
          readfile(filepath,res);
          return;
      }
      if (!realpath) {
          res.writeHead(404, {
              'Content-Type': 'text/plain;charset=UTF-8'
          });
          res.write("没有找到"+file_pathname);
          res.end(); 
          return;
      } 
      
      req.realpath = realpath;
      next();
  }
}

var css_transform = function (pkg_json){
    return function(req,res,next){
        var realpath = req.realpath;
        if (realpath.match(/\.s?css$/)) {
            sass.render({
                file : realpath
            }, function(error,result) {
                if (error) {
                    console.log("error file",realpath, error.message)
                    console.log("error file:"+error.file+"error line :" +error.line, "error column :"+ error.column , "error code :"+error.code );
                    res.writeHead(500, {
                        'Content-Type': 'text/plain'
                    });
                    res.write(error.message);
                    res.end();
                } else {
                    res.setHeader("Content-Type", "text/css");
                    res.write(result.css);
                    res.end();
                }
            }); 
        } else {
           next();
        }
    }
}
function browserify_middleware(pkg_json) {
    var config = pkg_json.browserify;
    return browserify(config);
}
    

function server(opt){
    var cwd = opt.cwd;
    var pj = require(cwd + "/package.json");

    connect.server({
        root : cwd,
        port: opt.port ,
        middleware : function(connect, opt){
            return [file_parse(pj),css_transform(pj),browserify_middleware(pj) ];
        }
    });
}


module.exports = server;
