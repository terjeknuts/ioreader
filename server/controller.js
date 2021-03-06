/*   
   Copyright 2011 Google Inc

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

var proxies = require('./proxies');
var m = require('mustache');
var fs = require('fs');
var async = require('async');
var exceptions = require('./exceptions');

var Controller = function(configuration) {
  var proxy = proxies.ProxyFactory.create(configuration);  
  var globalTemplates = [
    {type: "index", file: configuration.baseDir + "index.html"},
    {type: "category", file: configuration.baseDir + "category.html"},
    {type: "article", file: configuration.baseDir + "article.html"},
  ];

  /*
    Loads the template from the file system.
  */ 
  var loadTemplate = function(file, callback) {
    if(!!callback == false) throw new exceptions.NoCallbackException("No callback");
    fs.readFile(file,'utf8', function(err, data) {
      if(err) throw err;
      callback(data);
    });
  };

  /* 
   * Asynchronously load a list of templates. { file: "test.tmpl", type: "index" }
   * Loaded in the order of specification
   */
  var loadTemplates = function(templates, callback) {
    if(!!callback == false) throw new exceptions.NoCallbackException("No callback");
    
    var getTemplate = function (template) {
      return function(templateCallback) {
        loadTemplate(template.file, function(data) {
          templateCallback(null, { type: template.type, template: data })
        }); 
      };
    };

    var templateActions = templates.map(function(i) { return getTemplate(i); });
    async.parallel(templateActions, function(err, result){
      var output = {};
      result.forEach(function(item) { output[item.type] = item.template; });
    
      callback(output); 
    });
  };


  /*
   * Generates the app cache.
   */
  this.renderAppCache = function(callback) {
    if(!!callback == false) throw new exceptions.NoCallbackException("No Callback");
    
    var dynamicFiles = function(type, files) {
      return function(fileCallback) {
        fileCallback(null, {type: type, files: files});
      };
    };
     
    // currently only gets the the files in the root
    var getFiles = function (directory, type, globs) {
      globs = globs || [];
      return function(fileCallback) {
        fs.readdir(configuration.clientDir + directory, function(err, files) {
          if(!!files == false) {
            files = [];
          }
          var output = [];
          var file;
          for(var i = 0; file = files[i]; i++) {
            // ignore folders
            if(file.indexOf(".") <= 0) continue;
            var found = true;
            for(var g = 0; glob = globs[g]; g++) {
              found = !!file.match(glob + "$");
            }

            if(found == false) continue;

            output.push({name: directory + "/" + file});
          } 

          fileCallback(null, {type: type, files: output});
        });
      };
    };

    var fileActions = [];
    fileActions.push(dynamicFiles("css", [{name: "css/desktop.css"}, {name:"css/tablet.css"},{name: "css/phone.css"},{name: "css/tv.css"}]));
    fileActions.push(getFiles("lib", "scripts", ["\.js"]));
    fileActions.push(getFiles("css", "css", ["\.css"]));
    fileActions.push(getFiles("scripts", "scripts"));
    fileActions.push(getFiles("scripts/phone", "scripts"));
    fileActions.push(getFiles("scripts/tv", "scripts"));
    fileActions.push(getFiles("scripts/tablet", "scripts"));
    fileActions.push(getFiles("scripts/desktop", "scripts"));
    fileActions.push(getFiles("images", "images"));

    async.parallel(fileActions, function(err, result){
      var now = new Date();
      var data = {files: {}, now: now, version: configuration.version};
      var folder;

      for(var i = 0; folder = result[i]; i++) {
        if(!!data.files[folder.type] == false) data.files[folder.type] = [];
        var files = folder.files;
        var file;
        // Join files of types together 
        for(var f = 0; file = files[f]; f++) {
          data.files[folder.type].push(file);
        }
      }

      loadTemplate(configuration.baseDir + "app.cache", function(template) {
        callback(m.to_html(template, data));
      });
    });
  };

  var renderTemplate = function (data, state, format, callback) {
    var d = {"categories" : data, "configuration": configuration, "state": state};
    
    if(format == "json") {
      callback(JSON.stringify(d));
    }
    else {
      loadTemplates(globalTemplates, function(template) {
        callback(m.to_html(template.index, d, template));
      });
    }
  };

  /*
    Fetches and renders the categories for a given format.
  */ 
  this.fetchCategories = function(format, callback) {
    if(!!callback == false) throw new exceptions.NoCallbackException("No callback");
    proxy.fetchCategories(function(data) {
      renderTemplate(data, "menu", format, callback); 
    }); 
  };

  /*
    For a given category fetch and render the list of articles.
  */
  this.fetchCategory = function(id, format, callback) {
    if(!!id == false) throw new exceptions.Exception("Category id not specified");
    if(!!callback == false) throw new exceptions.NoCallbackException("No callback");
    
    proxy.fetchCategory(id, function(data) {
      renderTemplate(data, "category", format, callback); 
    }); 
  };

  this.fetchArticle = function(id, category, format, callback) {
    if(!!id == false) throw new exceptions.Exception("Article id not specified");
    if(!!callback == false) throw new exceptions.NoCallbackException("No callback");
    proxy.fetchArticle(id, category, function(data) {
      renderTemplate(data, "article", format, callback); 
    }); 
  };
};

var ControllerTests = function() {
  var controller = new Controller({name: "test"});

  var fetchCategoriesTestNoCallback = function() {
    Assert(controller.fetchCategories());
  };

  var fetchCategoryTestNoCallback = function() {
    Assert(controller.fetchCategory(""));
  };

  var fetchCategoryTestNoName = function() {
    Assert(controller.fetchCategory());
  };

  var fetchArticleTestNoCallback = function() {
    Assert(controller.fetchArticle(""));
  };

  var fetchArticleTestNoName = function() {
    Assert(controller.fetchArticle());
  };
};

exports.Controller = Controller;
