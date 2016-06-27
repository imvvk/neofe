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
var chalk =  require("chalk");

var argv = require("yargs")
    .alias("p","port")   // server port
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
  console.log(chalk.blue("start neofe local server port : %s ") , opts.port );
  b.server(opts);

} else if (find("build")) {
  var opt  = {};
  var task;
  if (find("html")) {
    task = "html";
  }
  opt.noversion = argv.noversion;
  b.build(task, opt);

} else if (find("pack")) {
  var opt  = {};
  var task;
  if (find("html")) {
    task = "html";
  }
  opt.noversion = argv.noversion;
  b.pack(task, opt);

} else if(find("deploy")){
  var task = argv.t , dist = argv.d;
  if(!task){
    console.error(chalk.red("not input deploy task"));
    return;
  }
  if (!dist) {
    console.error(chalk.red("no input deploy dist"));
    return;
  }
  b.deploy(task, dist, argv["not-promt"]);
} else if (find("show_common_deps")) {
  if (argv.help) {
    console.log("find multiple files dependent module, command: ");
    console.log(chalk.blue("neofe -f path/file1.js -f path/file2.js -f path/file3.js "))
    console.log("or input -c (--file_config)") 
    console.log(chalk.blue("neofe -c path/config.json"));
    console.log("config.json content :")
    console.log(JSON.stringify([
      "path/file1.js",
      "path/file2.js",
      "path/file3.js"
    ], null, " "));
  }
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
} else if (find("init")) {
  b.init();
} else {
  console.log(chalk.red("the commond not exist"), argv);

}


function find(key){
  return ~argv._.indexOf(key);
}
