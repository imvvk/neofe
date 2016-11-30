/****
 *
 * cache projects  config when server start 
 *
 ***/

var _ = require("lodash");

//project config
var PROJECT_CONFIG = {};
var PROJECT_KEY = [];


var DEFAULT_FILE_TYPES =  ["css","scss","js"];

function pretreatment(config) {
  config = config || {};
  
  var serverOpts = config.server || {},
      parseFileType = _.isEmpty(serverOpts.parseFileType) ?  DEFAULT_FILE_TYPES :  _.uniq(DEFAULT_FILE_TYPES.concat(serverOpts.parseFileType)),
      exp  = config.exports || {},
      exp_scripts = exp.scripts || [],
      exp_styles = exp.styles || [];

      exp_scripts = _.isArray(exp_scripts) ? exp_scripts : [ exp_scripts ];
      exp_styles = _.isArray(exp_styles) ? exp_styles : [ exp_styles ];

  config.__parseFileType = parseFileType;
  config.__exp_scripts = exp_scripts;
  config.__exp_styles = exp_styles;

}

module.exports = {

  set : function (key, config) {


    if (typeof key === "string") {
      pretreatment(config);
      PROJECT_CONFIG[key] = config;
      PROJECT_KEY[i] = new RegExp("^/("+key+")/");
    } else {
      config = key;
      pretreatment(config);
      PROJECT_CONFIG.__default = config;
    }
  },
  get : function (key) {
    if (key) {
      return  PROJECT_CONFIG[key];
    } 
    return  PROJECT_CONFIG.__default;
  },
  getKeysRegx : function () {
    return PROJECT_KEY;
  },
  getExportsScripts : function (key) {
    return this.get(key).__exp_scripts;
  },

  getExportsStyles : function (key) {
    return this.get(key).__exp_styles;
  },
  getParseFileType : function (key) {
    return this.get(key).__parseFileType;
  }
} 
