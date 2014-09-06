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
      var elementStyleAttributes = function(el){
        var style = window.getComputedStyle(el);
        var attributes = {};
        var propertyName;
        for(var j = 0; j<style.length; j++){
          propertyName = style.item(j);
          attributes[propertyName] = style.getPropertyValue(propertyName);
        };
        return attributes;
      };
      var extractChildStyles = function(base, baseSelector){
        if(baseSelector === undefined){
          baseSelector = '';
        };
        var output = [];
        for(var i = 0; i < base.children.length; i++){
          var child = base.children[i];
          var selector = baseSelector + '>' + child.nodeName + 
                         (child.id ? '#' + child.id : '') +
                         ':nth-child(' + (i+1) + ')';
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
            attributes: elementStyleAttributes(child),
            children: extractChildStyles(child, selector)
          });
        };
        return output;
      };
      var elementStyles = extractChildStyles(document.body, 'BODY');
      elementStyles.push({
        selector: 'HTML',
        attributes: elementStyleAttributes(document.documentElement),
        children: []
      });
      elementStyles.push({
        selector: 'BODY',
        attributes: elementStyleAttributes(document.body),
        children: []
      });
      return elementStyles;
    });
    var outputFile = htmlFile.replace('.html', '-' + testWidth + '.out');
    fs.write(outputFile, JSON.stringify(output), 'w');
    phantom.exit();
  }else{
    throw 'Failed to parse ' + htmlFile;
    phantom.exit();
  };
};

page.setContent(pageHTML, 'http://localhost/');
