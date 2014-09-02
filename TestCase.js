if(Meteor.isServer){
  var phantomjs = Npm.require('phantomjs');
  var shell = Npm.require('child_process');
  var fs = Npm.require('fs');
};

TestCases.TestCase = function(id){
  if(id === undefined){
    // TODO: Prepare new TestCase
  }else{
    var data = TestCases.findOne(id);
    if(!data){
      throw new Meteor.Error(404, "TestCase not found");
    };
  };

  _.extend(this, data);

  // Load latest Normative


  // Convert widths string into array
  this.widths = this.widths.split(',').map(function(width){
    return parseInt(width.trim(), 10);
  });
};

TestCases.TestCase.prototype.getHTML = function(){
  var linkTags = [];
  this.cssFiles.split('\n').forEach(function(href){
    linkTags.push('<link href="' + href + '?' + Date.now() + 
                  ' type="text/css" rel="stylesheet" />');
  });
  var frameId = 'test-frame-' + this._id,
      frameHTML = [
       '<html>',
       '<head>',
       linkTags.join('\n'),
       '<style>',
       '.failure-' + frameId + ' { outline: 2px solid #ff0; }',
       '</style>',
       '</head>',
       '<body>',
       this.fixtureHTML,
       '</body>',
       '</html>'].join('\n');
  return frameHTML;
};

TestCases.TestCase.prototype.extractStylesAsync = function(callback){
  var that = this;
  if(Meteor.isServer){
    var htmlFile = 'test-' + this._id + '.html';
    fs.writeFile(htmlFile, this.getHTML(), function(err) {
      if(err){
        console.log(err);
      }else{
        var testWidth = 1024;
        command = shell.spawn(phantomjs.path, 
          ['assets/app/phantomDriver.js', htmlFile, testWidth]);


        command.stdout.on('data', function(data){
          console.log('PhantomJS Error: ' + data);
        });

        command.stderr.on('data', function(data){
          console.log('PhantomJS Error: ' + data);
        });

        command.on('exit', function (code) {
          if(code === 0){
            var outFile = htmlFile.replace('.html', '-' + testWidth + '.out'),
                outContents = fs.readFileSync(outFile),
                styles = JSON.parse(outContents);
            callback.call(that, styles);
            // TODO: delete html file
          };
        });
      };
    });
  }else if(Meteor.isClient){
    Meteor.call('extractStyles', this._id, function(error, result){
      if(error){
        console.log('extractStyles Failed!');
        console.log(error, result);
        return;
      };
      callback.call(that, result);
    });
  };
};

TestCases.TestCase.prototype.setNormative = function(value){
  if(value === undefined){
    value = this.extractStyles();
  };
};

TestCases.TestCase.prototype.loadAllNormatives = function(){
};
