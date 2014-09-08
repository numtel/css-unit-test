var page = require('webpage').create();
var system = require('system');
var url = system.args[1];

page.open(url, function(status){
  if(status === 'success'){
    var output = page.evaluate(function(){
      var output = ''
      var style = document.getElementsByTagName('style');
      for(var i = 0; i<style.length; i++){
        output+= style[i].outerHTML + '\n';
      };
      var link = document.getElementsByTagName('link');
      for(var i = 0; i<link.length; i++){
        if(link[i].rel.toLowerCase() === 'stylesheet'){
          output+='<link rel="stylesheet" media="' + link[i].media + '" '+
                  'href="' + link[i].href + '" type="' + link[i].type + '">\n';
        };
      };
      return output;
    });
    console.log(output);
  }else{
    console.log('##ERROR##');
  };
  phantom.exit();
});
