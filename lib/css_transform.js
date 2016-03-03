var sass = require("node-sass");
var style_map = {
  "src" : "expanded",
  "dev" : "compact",
  "prd" : "compressed"
};

module.exports = function (devContext) {

  return function(req, res, next) {
    var realpath = req.realpath;
    if (realpath.match(/\.s?css$/)) {
      sass.render({
        file: realpath,
        outputStyle : style_map[devContext]
      }, function(error, result) {
        if (error) {
          console.log("error file", realpath, error.message)
          console.log("error file:" + error.file + "error line :" + error.line, "error column :" + error.column, "error code :" + error.code);
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
