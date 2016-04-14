# neofe


前端调试编译开发工具。利用Glup, Browserify 二次开发。目前测试版本，不稳定阶段。

a tool for fe developer

-- Alpha Version --

Install

npm install -g neofe

Usage :

neofe --help

### Usage: neofe [command] {OPTIONS}

Command :

    server  start a server for develop.   
            a minify  css or js file can map a local file by the server.
            本地启动一个服务器 ,通过这个服务器可以将打包混淆的css 或者 js 文件解析
            为本地开发中的文件。

          Options :

          --port, -p,  a port of the server. default 8998;
                       本地启动服务的端口号 . 默认 8998.
        --single, -s,  start single mode , a packed file is split into  separate files.
                       开启单一模式， 打包的文件将会被分解为多个单独的文件。


    build   as follow the package.json build the project  (pack, compress ,and minify  css or js file);
            根据package.json 构建项目 比如打包 压缩 混淆 CSS 或者 JS 文件 。


    deploy  deploy builded files  to the online  server .
          将构建后的file 发布到线上服务器. 一般应该用 jenkins.

          Options :
          --task , -t "cc / img / site / lua "  neofe deploy -t cc -d  将css/js 文件发布到 生产环境。
          --dist , -d "prd / beta / dev"


      Options :

      --help , -h  show help
      --version, -v show neofe version


### Package.json Example

    {
      "fePerfix" : ["/amy_h5","/src"], // 需要替换的前缀
      "browserify" : {
        "options" : {
          "transform" : ["juicerify"],
          "paths" : ["./src/scripts/lib/"],
          "external" : ["zepto","event"],
          "extensions" : [".tmpl"]
        },
        //输出文件
        "exports" : {
          "scripts" : ["./src/scripts/exports/**/*.js"],
          "styles" : ["./src/styles/exports/**/*.scss"]
        }
      },
      "build_path" : "./build",
      "verpath" : "./ver",
      "ver_options" : {
        "replace" : { "reg" : "/src" , "str" : ""}
      },
      //发布任务
      "deploy" : {
        "cc" : {
          "src" : "./build/src/",
          "dist" : "/home/amy_www/cc.amily.me/amy_h5/",
          "type" : "static"
        },
        "img" : {
          "src" : "src/image/",
          "dist" : "/home/amy_www/cc.amily.me/image/amy_h5/",
          "exclude " : ["*.sketch","*.psd"],
          "type" : "static"
        },
        "site" : {
          "src" : ["html/" , "ver/"],
          "dist" : "/home/amy/www/amy_h5/webapp",
          "type" : "server",
          "root" : "./"
        },
        "lua" : {
          "src" : "server/lua/",
          "dist" : "/home/amy/www/amy_h5/lua",
          "type" : "server"
        }
      }
    }
