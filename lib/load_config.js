
var fs = require("fs");
var path = require("path");
var extend = require("extend");

function loadConfig(cwd) {
  var content , config , isPkg;
  try {
    content = fs.readFileSync(path.join(cwd,"./neofe.config"), "utf-8");
  } catch(e) {
    isPkg = true;
    content = fs.readFileSync(path.join(cwd,"./package.json"),"utf-8");
  }
  if (!content) {
    console.error("read config file error , is packjson %s" , !!isPkg );
    return;
  }

  config = JSON.parse(content);

  if (isPkg) {
    if (config.browserify) {
      if (config.browser) {
        config.browserify.browser = config.browser;
      }
      if (config["browserify-shim"]){
        config.browserify.shim = config["browserify-shim"];
      }
      if (config.browserify.exports) {
        config.exports = config.browserify.exports;
        delete config.browserify.exports;
      }
      return config;
    } else {
      console.error("the config not have browserify field");
      return ;
    }
  } else {
    var pkg;
    try {
     pkg = JSON.parse(fs.readFileSync(path.join(cwd,"./package.json"),"utf-8"));
   } catch (e) {
     console.error("step 2 read pkgjson fail");
   }
   if (!pkg) {
     return config;
   }
   // merge browserify config which in packjson to neofe.config
   if (pkg.browser) {
     if (typeof pkg.browser === "string") {
       pkg.browser = JSON.parse(fs.readFileSync(path.join(pkg.browser),"utf-8"));
     }
     config.browserify.browser = extend(config.browserify.browser || {}, pkg.browser);
   }
   if (pkg["browserify-shim"]) {
     config.browserify.shim = extend(config.browserify.shim || {}, pkg["browserify-shim"]);
   }

   return config;

  }

}


module.exports = loadConfig;
