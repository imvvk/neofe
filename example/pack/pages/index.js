(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})
({"webapp/src/mods/mod.js":[function(require,module,exports){

require("./mod.scss");
var mod = {
  name : "this is example mod",
  render : function(id) {
    document.getElementById(id).innerHTML= '<div class="mod">mod is '+this.name+'</div>';
  }
};

module.exports = mod;

},{"./mod.scss":"webapp/src/mods/mod.scss"}],"webapp/src/mods/mod.scss":[function(require,module,exports){

},{}],"webapp/src/pages/index.js":[function(require,module,exports){

var mod = require("../mods/mod.js");

window.onload = function() {
  mod.render("mod_container");
  document.getElementById("logic").innerHTML = '<div class="logic"> this is logic content</div>';
}

},{"../mods/mod.js":"webapp/src/mods/mod.js"}]},{},["webapp/src/pages/index.js"]);
