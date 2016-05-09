# neofe


前端调试编译开发工具。Gulp + Browserify 二次开发 。

a tool for fe developer

Install

    npm install -g neofe

Usage :

    neofe --help

### Usage: neofe [command] {OPTIONS}

    Command :

    server  本地启动一个服务器 ,通过这个服务器可以将打包混淆的css 或者 js 文件解析
            为本地开发中的文件。
            start a server for develop.
            a minify  css or js file can map a local file by the server.

            Options :

            --port, -p,  a port of the server. default 8998;
                         本地启动服务的端口号 . 默认 8998.


    pack   仅打包，并不压缩和生存版本号 便于发布到DEV环境与产品人员调试
           just pack not min and create version

    build  根据package.json 构建项目 比如打包 压缩 混淆 CSS 或者 JS 文件 。
           as follow the package.json build the project  (pack, compress ,and minify css or js file);


    deploy  deploy builded files  to the online  server .
            将构建后的file 发布到线上服务器. 一般应该用 jenkins.

            Options :
            --task , -t neofe deploy -t cc -d beta  将css/js 文件发布到Beta环境。
            --dest , -d 目标环境  dev / beta / prd 
    
    init   在当前目录创建一个 neofe.config 文件 
           create neofe.config in proccess.cwd() path
     
    show_common_deps  从多个文件中提取公共依赖
                      find multiple files dependent module
                      Opitons :
                      --file , -f  需要提取的文件地址
                      --file_config, -c  多个文件可以用高配置
                      --help , -h  show help

Options :

  --help , -h  show help
  --version, -v show neofe version



neofe.config 介绍

    {
      "browserify": {
        "options": {
          "paths": [],
          "external": [],
          "extensions": [],
          "transform": [],
          "containCss" : false
        }
      },
      "exports": {
        "basedir": "./",
        "scripts": ["./src/scripts/exports/**/*.js"],
        "styles": ["./src/styles/exports/**/*.scss"],
        "htmls": ["./html/**/*.html"]
      },
      "server": {
        "parseFileType": ["css", "js", "html"]
      },
      "buildPath": "./build",
      "packPath": "./pack",
      "verpath": "./ver",
      "deploy": {
        "static": {
          "src": "./build/src/",
          "dest": "/home/www/static/",
          "username": "xxx",
          "exclude": [".git", ".svn"],
          "host": { 
            "dev" : "10.0.0.1",
            "beta": "10.0.0.1",
            "prd" : "10.0.0.1"
          }
        }
      }
    }

  **为了兼容老版本，也可以在package.json里写入配置文件，区别仅仅是exports 要写在 browserify 里面 **;
  **Config  could in package.json for hack old version **

### Package.json Example

    {
        "browserify" : {
          "options" : {
            "transform" : ["juicerify"],
            "paths" : [],
            "external" : [],
            "extensions" : [".tmpl"]
          },
          "exports" : {
            "basedir": "./",
            "scripts": ["./src/scripts/exports/**/*.js"],
            "styles": ["./src/styles/exports/**/*.scss"],
            "htmls": ["./html/**/*.html"]
          }
        },
        "server": {
          "parseFileType": ["css", "js", "html"]
        },
        "buildPath": "./build",
        "verPath": "./ver",
        "deploy": {
          "static": {
            "src": "./build/src/",
            "dest": "/home/www/static/",
            "username": "xxx",
            "exclude": [".git", ".svn"],
            "host": { 
              "dev" : "10.0.0.1",
              "beta": "10.0.0.1",
              "prd" : "10.0.0.1"
            }
          }
        }
    }


### 配置文件介绍  Config 

    browerify  options 是browserify 配置需要的options，其中以下属性不属于browserfiy options：
               containCss 为 true 表示 样式文件(例如：css scss) 将被打包为 module.epxorts="{{文件内容}}",
               否则将被独立输出

               outCss 表示pack 或者 build 时输出与js 同名的css 文件
    
    exports  项目的输出文件，在server 启动中只有符合 exports glob的请求才会被解析
             {file : "path/file" , expose: "String" , outCss : boolean ,containCss : boolean }
             可以简写为 "path/file" 
             默认值 
             expose为 undefined 
             outCss false
             containCss false
