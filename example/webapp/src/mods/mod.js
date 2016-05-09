
require("./mod.scss");
var mod = {
  name : "this is example mod",
  render : function(id) {
    document.getElementById(id).innerHTML= '<div class="mod">mod is '+this.name+'</div>';
  }
};

module.exports = mod;
