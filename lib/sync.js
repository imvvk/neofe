var fs = require("fs");
var gulp = require("gulp");
var rsync = require("gulp-rsync");
var path = require("path");
var prompt = require("gulp-prompt");
var extend = require("extend");
var chalk = require("chalk");
var gp = require("gulp-print");

var load_config = require("./load_config.js");


var def_options = {
  emptyDirectories : true,
  progress: true,
  relative : true,
  recursive: true
};

/**
  "cc" : {
    "src" : "./build/src/",
    "" : "/home/amy_www/cc.amily.me/amy_h5/",
    "type" : "static"
  },
 *
 *

"cc" : {
        "src" : "./build/src/",
        "" : "/home/amy_www/cc.amily.me/amy_h5/",
        "type" : "static"
      },

 **/

function readConfig(cwd){
  var config = load_config(cwd) , 
    deploy_conf = config.deploy,
    dest_conf;

  if (fs.existsSync(path.join(cwd,"./sync.json"))) {
    dest_conf = JSON.parse(fs.readFileSync(path.join(cwd , "./sync.json"),"utf8"));
  }

  if (!deploy_conf){
      console.error(chalk.red("not have deploy conf"));
      return false;
  }
  return {
    deploy_conf : deploy_conf,
    dest_conf : dest_conf
  };
}


function deploy(cwd, task, dest){
  var conf = readConfig(cwd);
  if (!conf){
    return;
  }
  
  var dp_conf = conf.deploy_conf[task];
  if (!dp_conf) {
    console.error(chalk.red("not have " + task + " config"));
    return;
  }

  var server_conf = conf.dest_conf ? conf.dest_conf[dest] : null;
  sync(dp_conf, server_conf, cwd, task, dest);

}


function sync(dp_conf,server_conf ,cwd,task,dest){
  var username , hostname ;
  if (server_conf) {
    hostname = server_conf[dp_conf.type] ;
    username = server_conf.user || dp_conf.user || undefined;
  } else {
    username = dp_conf.user || undefined;
    hostname = dp_conf.host;
    if (typeof hostname === "object") {
      hostname = hostname[dest];
    }
    delete dp_conf.username;
    delete dp_conf.host;
  }
  var dest = dp_conf.dest || dp_conf.dist;
  var src = dp_conf.src;

  delete dp_conf.dest;
  delete dp_conf.dist;
  delete dp_conf.src;

  var opt = extend ({} , def_options , dp_conf,{
    username : username,
    hostname : hostname,
    destination : dest,
    exclude : (dp_conf.exclude || []).concat(['.DS_Store','.svn'])
  });
  console.log(chalk.blue("start deploy task: %s to dest: %s"), task , dest);
  console.log(chalk.green(JSON.stringify(opt, null, " ")));

  console.log(src);

  gulp.src(src)
      .pipe(gp())
      .pipe(prompt.confirm("确认要将"+task+"上传到《"+dest+"》环境么"))
      .pipe(rsync(opt));
}

function wrap_path (cwd,_path){
    if (Array.isArray(_path)){
      return _path.map(function(p){
        return path.join(cwd,p);
      });
    }
    return path.join(cwd,_path);
}
module.exports = deploy;
