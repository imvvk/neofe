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
    .alias("t","task")
    .alias("p","port")
    .alias("d","dist")
    .argv;


var b = require('./args');

if (find("server")) {
  if (typeof argv.p !== "number"){
    argv.p = 8998;
  }
  b.server(argv.p);
}


if (find("build")) {
  console.log("start build======");
  b.build();
}
if(find("deploy")){
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
}

if(find("upload")){
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
  b.deployS(task,dist);
}

function find(key){
  return ~argv._.indexOf(key);
}
