var fs = require('fs')
var path = require('path')
var connect = require("gulp-connect");
var url = require("url");

// server middleware
var find_file = require("./find_file.js");
var css_transform = require("./css_transform.js");
var js_transform = require("./js_transform.js");

/**
 * options {
 * 	 isMulti :  multi project
 * 	 devContext : src dev  prd
 * 	 projects :  project config for router
 * }
 *
 */

// init project config

var PROJECT_CONFIG = {};
var PROJECT_KEY = [];

function server(cwd, options) {
  options = options || {};
  var packjson = require(cwd + "/package.json");
  var projects = packjson.projects;
  if (projects) {
    options.isMulti = true;
    options.projects = projects;
  } else {
    options.isMulti = false;
  }
  options.devContext = options.devContext || "src";

  initPackjson(cwd,projects);

  connect.server({
    root: cwd,
    port: options.port,
    middleware: function(connect, opt) {
      return [router(cwd),find_file(cwd), css_transform(options.devContext), js_transform(options.devContext)];
    }
  });

}

function initPackjson(cwd,projects){
  if (projects) {
    Object.keys(projects).forEach(function(key,i){
      try {
        PROJECT_CONFIG[key] = JSON.parse(fs.readFileSync(path.join(cwd , key , "./package.json"),"utf8"));
        PROJECT_KEY[i] = new RegExp("^/("+key+")/");
      } catch(e) {
          console.error("msg==",e.message);
      }
    });
  } else {
    PROJECT_CONFIG.default = JSON.parse(fs.readFileSync(path.join(cwd , "./package.json"),"utf8"));
  }
}

function router(cwd) {
  var regs =  PROJECT_KEY;
  return function(req,res,next){
    req.url = req.url.replace(/^\/\//,"/");
    if (req.url === "/favicon.ico") {
      return res.end("ooo");
    }
    var path_obj = url.parse(req.url),
        pathname = path_obj.pathname,
        key , t;

    for (var i = 0 , l = regs.length; i < l ; i++) {
      if (t = pathname.match(regs[i])){
        key = t[1];
        break;
      }
    }
    if (key) {
      req.packjson = PROJECT_CONFIG[key];
      req.basedir = path.join(cwd,key);
      //req.pathname = pathname.replace(key,"src");
      //req.basedir = cwd;
      req.pathname = pathname;
    } else {
      req.packjson = PROJECT_CONFIG["default"];
      req.basedir = cwd;
      req.pathname = pathname;
    }
    //console.log("basedir====",req.basedir);
    next();
  }

}


module.exports = server;
