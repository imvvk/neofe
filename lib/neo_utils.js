/**
 * [find_prefix 对比请求URL 和物理路径找出不同的前缀]
 * @param  {[type]} url     [请求url]
 * @param  {[type]} filepath [物理路径]
 * @return {[type]}         [object {
 *      url_prefix : "",
 *
 * }]
 */

function find_prefix(url, filepath) {
  url = url.replace(/\?[^\?]*$/,"");
  var i = 0,l = url.length - 1,fl = filepath.length - 1;

  while (i <= l) {
    if (!(url[l - i] === filepath[fl - i])) {
      break;
    }
    i++;
  }

  var re1 = url.substring(0, l - i + 1);
  var re2 = filepath.substring(0, fl - i + 1);

  return {
    url_prefix : re1,
    file_prefix : re2
  }

}
/**
 * 分析一个入口文件的依赖
 * 之后可以将依赖单独加载便于调试
 * 如果报错可以直接定位到出错的文件，
 * 而不是在打包的一个文件里查找。
 * find dependencies  of  an entry file
 * load dependent files can be decomposed to facilitate debugging
 * @param  {[type]} deps  [description]
 * @param  {[type]} start [description]
 * @return {[type]}       [description]
 */
function get_deps(deps,start) {
  var arr = [] , keys = {} , dep_keys = {};
  var s = start || deps[deps.length -1];
  if (!s) {
    return [];
  }
  recursion(s)
  return arr.map(function(obj){
    return obj.file;
  });
  return arr.sort(function(a,b){
    if (a.index === "top" ) {
      if (b.index === "top") {
        return 0;
      }
      return -1;
    } else if (b.index === "top") {
      return 1;
    } else {
      return b.index - a.index;
    }
  }).map(function(obj){
    return obj.file;
  });

  function recursion (obj){
    var deps = obj.deps;
    //console.log(obj);
    if (!isEmpty(deps)) {
        for(var i in deps) {
            if (deps.hasOwnProperty(i)){
              // external dep is false
              if (deps[i] && !dep_keys[deps[i]]) {
                // 防止循环引用
                dep_keys[deps[i]] = true;
                var deps_file = find(deps[i]);
                if (deps_file) {
                  recursion(deps_file);
                } else {
                  if (!keys[deps_file]){
                    arr.push({file: obj.file , index : "top"});
                    keys[deps_file] = true;
                  }
                }
              }
            }
        }
    }
    if (!keys[obj.file]){
      if (!obj.entry) {
        arr.push({file: obj.file , index : obj.index});
      }
      keys[obj.file] = true;
    }
  }

  function find(file){
    for(var i = 0 , l = deps.length ;i < l;i++){
      if (deps[i].file === file) {
        return deps[i];
      }
    }
    console.log("file is==",file);
    return null;
  }

  function isEmpty(o){
    if (o instanceof Array) {
      return o.length;
    }else if (typeof o === "object" ) {
      for(var i in o) {
        if (o.hasOwnProperty(i)){
          return false;
        }
      }
      return true;
    } else if (typeof o === "string" ) {
      return !!o;
    }
    console.error("not array or object");
    return false
  }

}

module.exports.find_prefix = find_prefix;
module.exports.get_deps = get_deps;
