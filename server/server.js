var phantomjs = Npm.require('phantomjs');
var spawn = Npm.require('child_process').spawn;
var fs = Npm.require('fs');

Meteor.startup(function () {
  // code to run on server at startup
  Future = Npm.require('fibers/future');
});

Meteor.publish("TestCases", function () {
  //return TestCases.find();
  if(this.userId==null){
    return [];
  };
  return TestCases.find({$or: [{invited: this.userId}, {owner: this.userId}]});
});

var getHTML = function(test){
  var linkTags = [];
  test.cssFiles.split('\n').forEach(function(href){
    linkTags.push('<link href="' + href + '?' + Date.now() + 
                  ' type="text/css" rel="stylesheet" />');
  });
  var frameId = 'test-frame-' + test._id,
      frameHTML = [
       '<html>',
       '<head>',
       linkTags.join('\n'),
       '<style>',
       '.failure-' + frameId + ' { outline: 2px solid #ff0; }',
       '</style>',
       '</head>',
       '<body>',
       test.fixtureHTML,
       '</body>',
       '</html>'].join('\n');
  return frameHTML;
};

Meteor.methods({
  runTest: function(options){
    var fut = new Future();
    var test = TestCases.findOne(options.id);
    if(!test){
      return 'Invalid test specified!';
    };
    var htmlFile = 'test-' + test._id + '.html';
    console.log(phantomjs);
    fs.writeFile(htmlFile, getHTML(test), function(err) {
      if(err){
        console.log(err);
      }else{
        command = spawn(phantomjs.path, ['assets/app/phantomDriver.js', htmlFile]);

        command.stdout.on('data',  function (data) {
          console.log('stdout: ' + data);
        });

        command.stderr.on('data', function (data) {
          console.log('stderr: ' + data);
        });

        command.on('exit', function (code) {
          console.log('child process exited with code ' + code);
          // TODO: delete html file
        });
      };
      fut['return']('whooo');
    }); 
    return fut.wait();
  }
});
