var fs = require("fs")
var path = require("path");
var parsePath = require('parse-filepath');

var a = "/Users/wk/amy/amy_bd/src/scripts/exports/index.js";
var b = "/amy_bd/src/scripts/exports/index.js";
var p = parsePath(b);

console.log(p);

fs.exists(a,function(s){
   console.log("====",s); 
});

fs.stat(a,function(s,stat){
    if (s) {
       console.log("文件不存在sss",s); 
    } else {
       console.log("stat===",stat.isFile());
    }
})

