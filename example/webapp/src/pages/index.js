
var mod = require("../mods/mod.js");

window.onload = function() {
  mod.render("mod_container");
  document.getElementById("logic").innerHTML = '<div class="logic"> this is logic content</div>';
}
