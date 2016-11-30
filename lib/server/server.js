
//global log
var Log = require("log");
var log = global.log = new Log("info");

var fs = require('fs')
var path = require('path')
var connect = require("gulp-connect");
var url = require("url");
var chalk = require("chalk");

var serverProjectConfig = require("./server_project_config.js");
var loadConfig = require("../load_config.js");

// server middleware
var locateFile = require("./middleware/locate_file.js");
var transformFile = require("./middleware/transform_file.js");

/**
 * options {
 * 	 isMulti :  multi project
 * 	 devContext : src dev  prd
 * 	 projects :  project config for router
 * }
 *
 */



function server(cwd, options) {
  options = options || {};
  var packjson, projects;
  try {
    packjson = require(cwd + "/package.json");
    projects = packjson.projects;
  } catch (e) {
    console.info(chalk.red("not find packjson"));   
  }
  //多个项目根目录
  if (projects) {
    options.isMulti = true;
    options.projects = projects;
  } 
  //单个项目
  else {
    options.isMulti = false;
  }

  options.devContext = options.devContext || "src";

  readPackjson(cwd,projects);
  
  
  //start server
  connect.server({
    root: cwd,
    port: options.port,
    middleware: function(connect, opt) {
      return [router(cwd, options), locateFile(cwd, options) , transformFile(cwd, options)];
    }
  });
}

function readPackjson(cwd,projects){
  if (projects) {
    Object.keys(projects).forEach(function(key,i){
      try {
        serverProjectConfig.set(key, loadConfig(path.join(cwd,projects[key])));
      } catch(e) {
          log.error("project config read error [ %s ]",e.message);
      }
    });
  } else {
    serverProjectConfig.set(loadConfig(cwd));
  }
}

function router(cwd,opts) {
  var regs =  serverProjectConfig.getKeysRegx();
  return function(req,res,next){
    req.url = req.url.replace(/^\/\//,"/");
    if (req.url === "/favicon.ico") {
      return res.end("");
    }
    var path_obj = url.parse(req.url,true),
        pathname = path_obj.pathname,
        key , t;

    //set query string to req
    //bundle or css parse use
    req.query = path_obj.query ;

    for (var i = 0 , l = regs.length; i < l; i++) {
      if (regs[i]){
        if (t = pathname.match(regs[i])){
          key = t[1];
          break;
        }
      }
    }
    if (key) {
      req.key = key;
      req.packjson = serverProjectConfig.get(key);
      req.basedir = path.join(cwd,opts.projects[key]);
      req.pathname = pathname;
    } else {
      req.packjson = serverProjectConfig.get();
      req.basedir = cwd;
      req.pathname = pathname;
    }
    next();
  }

}


module.exports = server;
