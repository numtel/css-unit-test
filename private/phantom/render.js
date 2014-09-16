var page = require('webpage').create();
var system = require('system');
var fs = require('fs');
var htmlFile = system.args[1];
var testWidth = system.args[2];
var thumbWidth = system.args[3];
var pageHTML = fs.read(htmlFile);

page.zoomFactor = thumbWidth / testWidth;
page.viewportSize = {
  width: testWidth * page.zoomFactor,
  height: testWidth * page.zoomFactor * 0.75
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
    var imageData = page.renderBase64('PNG');
    console.log('data:image/png;base64,' + imageData);
    phantom.exit();
  }else{
    throw 'Failed to parse ' + htmlFile;
    phantom.exit();
  };
};

page.setContent(pageHTML, 'http://localhost/');
