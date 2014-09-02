var page = require('webpage').create();
var system = require('system');
var fs = require('fs');
var htmlFile = system.args[1];
var testWidth = system.args[2];
var pageHTML = fs.read(htmlFile);

page.viewportSize = {
  width: testWidth,
  height: 800
};

page.onLoadFinished = function(status){
  if(status === 'success'){
    var output = page.evaluate(function(){
      var extractComputedStyles = function(base, baseSelector){
        if(baseSelector === undefined){
          baseSelector = '';
        };
        var output = [];
        for(var i = 0; i < base.children.length; i++){
          var child = base.children[i];
          var selector = baseSelector + '>' + child.nodeName + 
                         (child.id ? '#' + child.id : '') +
                         ':nth-child(' + (i+1) + ')';

          // Grab computed style attributes
          var style = window.getComputedStyle(child);
          var attributes = {};
          var propertyName;
          for(var i = 0; i<style.length; i++){
            propertyName = style.item(i);
            attributes[propertyName] = style.getPropertyValue(propertyName);
          };

          // Grab matching rules
          var ruleList = child.ownerDocument.defaultView.getMatchedCSSRules(child, '') || [];
          var rules = [];
          for(var i = 0; i<ruleList.length; i++){
            rules.push({
              selector: ruleList[i].selectorText,
              sheet: ruleList[i].parentStyleSheet.href
            });
          };

          output.push({
            selector: selector,
            attributes: attributes,
            rules: rules,
            children: extractComputedStyles(child, selector)
          });
        };
        return output;
      };
      return extractComputedStyles(document.body, 'BODY');
    });
    var outputFile = htmlFile.replace('.html', '-' + testWidth + '.out');
    fs.write(outputFile, JSON.stringify(output), 'w');
    page.render('/home/ben/test.jpg');
    phantom.exit();
  }else{
    phantom.exit();
  };
};
page.setContent(pageHTML, 'http://localhost/');
