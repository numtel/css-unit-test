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

var resourceFailures = [];
page.onResourceReceived = function(response) {
  if(response.stage === 'end' && response.status !== 200){
    resourceFailures.push(response.url + 
      '(' + response.status + ': ' + response.statusText + ')');
  };
};

page.onLoadFinished = function(status){
  if(status === 'success'){
    if(resourceFailures.length){
      console.log('Failed to load: ' + resourceFailures.join(', '));
    };
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
          var classes = '';
          for(var j = 0; j<child.classList.length; j++){
            classes += '.' + child.classList[j];
          };
          var selector = baseSelector + '>' + child.nodeName + 
                         (child.id ? '#' + child.id : '') + classes +
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

          var attributes = {};
          if(!child.attributes.hasOwnProperty('test-ignore')){
            attributes = elementStyleAttributes(child);
          };

          output.push({
            selector: selector,
            attributes: attributes,
            children: extractChildStyles(child, selector)
          });
        };
        return output;
      };
      // Add <body> children, then <html> and <body> separately.
      var elementStyles = extractChildStyles(document.body, 'BODY');
      [['HTML', document.documentElement], 
       ['BODY', document.body]]
      .forEach(function(additional){
        if(!additional[1].attributes.hasOwnProperty('test-ignore')){
          elementStyles.push({
            selector: additional[0],
            attributes: elementStyleAttributes(additional[1]),
            children: []
          });
        };
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
