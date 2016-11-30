var _ = require("lodash");
var prepare = require('prepare-response');
var path = require("path");
var url = require("url");
var querystring = require("querystring");

var serverProjectConfig = require("../server_project_config.js");
var scriptsTransform = require("../../transform/script_transform.js");
var stylesTransform = require("../../transform/style_transform.js");


function transform(cwd, options) {

  return function (req, res, next) {
    var key = req.key;
    var realpath = req.realpath;
    var packjson = serverProjectConfig.get(key);

    var isOutCss = !!req.headers.accept.match(/text\/css/i) 
                 || querystring.parse(url.parse(req.url).query || "").css;
   
    if (!packjson) {
      var e =  new Error("req can't find a packjson");
      return next(e);
    }

    if (req.pathname.match(/\.(scss|css)$/)) {
      stylesTransform.build(req.realpath, {
        outputstyle :  "expanded"
      }).then(function (data) {
        var text = data.text;
        send(text, req, res, true); 
      }).catch(outError.bind(this, req, res));
    } else {
      scriptsTransform.build(req.realpath, req.file_config, packjson).then(function (data) {
        var script_text = data.script_text, 
          style_text = data.style_text;
        if (isOutCss) {
          send(style_text, req, res, isOutCss); 
        } else {
          send(script_text, req, res, isOutCss); 
        }
      }).catch(outError.bind(this, req, res));
    }

  }

}

function send(content, req, res, isOutCss) {
  var headers ;
  if (!isOutCss) {
    headers = {'content-type': 'application/javascript;charset=UTF-8'};
  } else {
    headers = {'content-type': 'text/css; charset=UTF-8'};
  }
  prepare(content, headers, {gzip: false}).send(req, res);
}

function outError (req, res, err) {
  res.statusCode = 500;
  res.write(err.stack.toString());
  res.end();
}

function getResponse(b, isOutCss) {
  var headers ;
  if (!isOutCss) {
    headers = {'content-type': 'application/javascript;charset=UTF-8'};
  } else {
    headers = {'content-type': 'text/css; charset=UTF-8'};
  }
  return  getSource(bundle,isOutCss).then(function (src) {
    return prepare(src, headers, {gzip: false})
  });
}

function getSource(bundle,isOutCss) {
  return new Promise(function (resolve, reject) {
      bundle.bundle(function (err, js_src ,css_src) {
        if (err) return reject(err);
        if (!isOutCss) {
          resolve(js_src);
        } else {
          resolve(css_src);
        }
      });
  }).then(function (src) {
    src = (src || "").toString();
    return src;
  });
}

module.exports = transform;


