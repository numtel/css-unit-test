var page = require('webpage').create();
var system = require('system');
var fs = require('fs');
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
    output.push({
      selector: selector,
      styles: window.getComputedStyle(child),
      children: extractComputedStyles(child, selector)
    });
  };
  return output;
};
console.log(system.args);
var htmlFile = system.args[1];
console.log(htmlFile);
console.log(fs);
var pageHTML = fs.read(htmlFile);
console.log(pageHTML);
page.onLoadFinished = function(status){
  console.log('status', status);

  console.log(document.body.children.length);
  var output = extractComputedStyles(document.body, 'BODY');
  console.log(output);
  phantom.exit();
};
page.setContent(pageHTML, 'http://localhost/');
