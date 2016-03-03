var fs = require("fs");
var gulp = require("gulp");
var rsync = require("gulp-rsync");
var path = require("path");
var prompt = require("gulp-prompt");
var extend = require("util")._extend;

var deploy_conf , dist_conf  ;

var def_options = {
  emptyDirectories : true,
  progress: true,
  relative : true,
  recursive: true
};



function readConfig(cwd){
  deploy_conf = JSON.parse(fs.readFileSync(path.join(cwd , "./package.json"),"utf8")).deploy;
  dist_conf = JSON.parse(fs.readFileSync(path.join(cwd , "./sync.json"),"utf8"));

  if (!deploy_conf){
      console.error("not have deploy conf");
      return false;
  }
  if (!dist_conf) {
    console.error("not have dist conf");
    return false;
  }

  return true;
}


function deploy(cwd,task,dist){
  if (!readConfig(cwd)){
    return;
  }
  var dp_conf = deploy_conf[task];
  if (!dp_conf) {
    console.error("not have " + task + " config");
    return;
  }
  var server_conf = dist_conf[dist];
  if (!server_conf) {
    console.error(dist + "is not allow");
    return;
  }

  sync(dp_conf,server_conf,cwd,task,dist);

}


function sync(dp_conf,server_conf ,cwd,task,dist){
  var opt = extend ({
    username : server_conf.user,
    hostname : server_conf[dp_conf.type],
    destination : dp_conf.dist,
    silent : false,
    exclude : (dp_conf.exclude || []).concat(['.DS_Store','.svn'])
  },def_options);
  if (Array.isArray(dp_conf.src)){
    opt.root = wrap_path(cwd,dp_conf.root || "./");
  } else {
    opt.root =  wrap_path(cwd,dp_conf.src);
  }

  console.log(opt);


  gulp.src(wrap_path(cwd,dp_conf.src) , {base: wrap_path(cwd,dp_conf.src)})
      .pipe(prompt.confirm("确认要将"+task+"上传到《"+dist+"》环境么"))
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
