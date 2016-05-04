#!/usr/bin/env node

/**
 *	cmd list :
 *
 *	server :
 *	neofe server -p number  or neofe server --port number
 *
 *  build :
 *  neofe build
 *
 *
 *
 */

var fs = require('fs');
var JSONStream = require('JSONStream');
var through = require('through2');
var argv = require("yargs")
    .alias("p","port")   // server port
    .alias("s","single") // browerify not pack  single mod
    .alias("d","dist")   // deploy dist name
    .alias("t","task")   // deploy task name
    .alias("h","help")
    .alias("f","files")
    .alias("c","file_config")
    .alias("v","version")
    .argv;


var b = require('./args');

if (find("server")) {
  var opts = {};
  opts.port = argv.port;
  opts.single = argv.single;

  if (typeof opts.port !== "number"){
    opts.port = 8998;
  }
  console.log("start neofe local server port : %s , mode : %s .",opts.port , opts.single ? "single" : "pack");
  b.server(opts);

} else if (find("build")) {
  console.log("start build======");
  b.build();
}else if(find("deploy")){
  var task = argv.t , dist = argv.d;
  if(!task){
    console.error("not input deploy task");
    return;
  }
  if (!dist) {
    console.error("no input deploy dist");
    return;
  }
  console.log("start deploy======");
  b.deploy(task,dist);
} else if (find("show_common_deps")) {
  var files = argv.files ;
  if (files) {
    b.show_common_deps(files);
  } else if(argv.file_config) {
    var config = JSON.parse(fs.readFileSync(argv.file_config));
    b.show_common_deps(config);
  }
} else if (argv.h) {
  return fs.createReadStream(__dirname + '/cmd.txt')
        .pipe(process.stdout)
        .on('close', function () { process.exit(1) });
} else if (argv.v) {
  return console.log(require('../package.json').version);
} else {
  console.log("the commond not exist", argv);

}


function find(key){
  return ~argv._.indexOf(key);
}
