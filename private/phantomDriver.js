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
          for(var j = 0; j<style.length; j++){
            propertyName = style.item(j);
            attributes[propertyName] = style.getPropertyValue(propertyName);
          };

          // Grab matching rules
          // TODO: Seems to crash phantomjs...maybe webkit too old?
//           var ruleList = child.ownerDocument.defaultView.getMatchedCSSRules(child, '');
//           var rules = [];
//           for(var j = 0; j<ruleList.length; j++){
//             rules.push({
//               selector: ruleList[j].selectorText,
//               sheet: ruleList[j].parentStyleSheet.href
//             });
//           };

          output.push({
            selector: selector,
            attributes: attributes,
            children: extractComputedStyles(child, selector)
          });
        };
        return output;
      };
      return extractComputedStyles(document.body, 'BODY');
    });
    var outputFile = htmlFile.replace('.html', '-' + testWidth + '.out');
    fs.write(outputFile, JSON.stringify(output), 'w');
    phantom.exit();
  }else{
    phantom.exit();
  };
};
page.setContent(pageHTML, 'http://localhost/');
