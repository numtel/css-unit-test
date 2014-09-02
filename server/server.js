var phantomjs = Npm.require('phantomjs');
var shell = Npm.require('child_process');
var fs = Npm.require('fs');
var Future = Npm.require('fibers/future');

Meteor.startup(function () {
  // code to run on server at startup
});

Meteor.publish("TestCases", function () {
  if(this.userId==null){
    return [];
  };
  return TestCases.find({owner: this.userId});
});


Meteor.methods({
  extractStyles: function(id){
    var fut = new Future();
    var test = new TestCases.TestCase(id);
    test.extractStylesAsync(function(result){
      fut['return'](result);
    });
    return fut.wait();
  },
  runTest: function(options){
    var fut = new Future();
    var test = new TestCases.TestCase(options.id);
    if(test.invalid){
      return 'Invalid test specified!';
    };
    var htmlFile = 'test-' + test._id + '.html';
    fs.writeFile(htmlFile, test.getHTML(), function(err) {
      if(err){
        console.log(err);
      }else{
        var testWidth = 1024;
        command = shell.spawn(phantomjs.path, ['assets/app/phantomDriver.js', htmlFile, testWidth]);

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
