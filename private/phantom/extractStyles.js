var page = require('webpage').create();
var system = require('system');
var fs = require('fs');
var htmlFile = system.args[1];
var testWidth = system.args[2];
var testURL = system.args[3];
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
      var elementStyleAttributes = function(el, style){
        if(style === undefined){
          style = window.getComputedStyle(el);
        };
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

          // getMatchedCSSRules only works for stylesheets from the same origin
          var ruleList = child.ownerDocument.defaultView.getMatchedCSSRules(child, '');
          var rules = [];
          if(ruleList){
            for(var j = 0; j<ruleList.length; j++){
              rules.push({
                selector: ruleList[j].selectorText,
                sheet: ruleList[j].parentStyleSheet.href,
                attributes: elementStyleAttributes(undefined, ruleList[j].style)
              });
            };
          };

          output.push({
            ignore: child.attributes.hasOwnProperty('test-ignore'),
            selector: selector,
            attributes: elementStyleAttributes(child),
            rules: rules,
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
        elementStyles.push({
          ignore: additional[1].attributes.hasOwnProperty('test-ignore'),
          selector: additional[0],
          attributes: elementStyleAttributes(additional[1]),
          children: []
        });
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

page.setContent(pageHTML, testURL);
