
var Promise = require("bluebird");
var sass = require("node-sass-china");
var extend =  require('extend');

var build = function (file_path, options) {

  var opts =  extend({}, options);
  opts.file = file_path;
  
  return new Promise(function (resolve, reject) {
    sass.render(opts, function (err, result) {
      if (err) {
        reject(err);
      } else {
        resolve({ text : result.css});
      }
    });
  }); 
}

module.exports = {
  build : build
}
