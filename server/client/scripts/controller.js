var BaseController = function() {
  // An external controller can be mixed in that provides the interaction with the different form factors
    
  var fireEvent = function(name, data) {
    var e = document.createEvent("Event");
    e.initEvent(name, true, true);
    e.data = data;
    window.dispatchEvent(e);
  };

  // URL Events
  var onRootChanged = function(request) {
    gotoRoot();
  };

  var onCategoryChanged = function(request) {
    changeCategory(request.params.category);
  };

  var onArticleChanged = function(request) {
    var data = request.params;
    changeArticle(data.category, data.article);
  };

  // Event triggers
  var gotoRoot = function() {
    $("html").attr("class", "menuState");
    $(".category").removeClass("active");

    fireEvent("rootchanged", {});
  };

  var changeCategory = function(categoryElement) {
    var category = categoryElement

    $("html").attr("class", "categoryState");
    $(".category").removeClass("active");
    $("article").removeClass("active");
    $("li[data-category='"+ category +"']").addClass("active");
    $("section[data-category='"+ category +"']").addClass("active");
    
    fireEvent("changecategory", {category: category});
  };

  var changeArticle = function(category, article) {

    $(".category").removeClass("active");
    $("article").removeClass("active");
    $("li[data-category='"+ category +"']").addClass("active");
    $("section[data-category='"+ category +"']").addClass("active");
    $("article[data-article='" + article + "']").addClass("active");

    fireEvent("changearticle", {category: category, article: article});
  };

  var fetchArticle = function(category, article, callback) { 
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4 && xhr.status == 200) {
        var article = JSON.parse(xhr.responseText);
        callback(article);
        fireEvent("articleready", article); 
      }
    };
    xhr.open("GET", "/reader/" + category + "/" + article + ".json");
    xhr.send();
  };

  var activate = function(element) {
    var data = $(element).data();
    
    if(data.article) {
      if (window.history.pushState) {
        window.history.pushState(undefined, "", "/reader/" + data.category + "/" + data.article );
      }
      changeArticle(data.category, data.article);
      fetchArticle(data.category, data.article, function(result) {
        var categories = result.categories;
        var category;
        for(var i = 0; category = categories[i]; i++) {
          if(category.articles.length >0) {
            $(".story", element).html(category.articles[0].body);
            break;
          }
        } 

      });
    }
    else if(data.category) {
      if (window.history.pushState) {
        window.history.pushState(undefined, "", "/reader/" + data.category );
      }

      changeCategory(data.category);
    }
    else {
      if (window.history.pushState) {
        window.history.pushState(undefined, "", "/reader/" + data.category + "/" + data.article );
      }

      changeRoot();
    }
  };

  var app = new routes(); 
  app.get("^/", onRootChanged);
  app.get("^/reader/:category", onCategoryChanged);
  app.get("^/reader/:category.html", onCategoryChanged);
  app.get("^/reader/:category/:article", onArticleChanged);

  return {
    onRootChanged: onRootChanged,
    onCategoryChaged: onCategoryChanged,
    onArticleChanged: onArticleChanged,

    activate: activate
  };
};
