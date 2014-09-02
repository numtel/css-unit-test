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

  // Convert widths string into array
  this.widths = this.widths.split(',').map(function(width){
    return parseInt(width.trim(), 10);
  });
};

TestCases.TestCase.prototype.getHTML = function(){
  var linkTags = [];
  this.cssFiles.split('\n').forEach(function(href){
    linkTags.push('<link href="' + href + '?' + Date.now() + '" ' +
                  'type="text/css" rel="stylesheet" />');
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
          console.log('PhantomJS stdout: ' + data);
        });

        command.stderr.on('data', function(data){
          console.log('PhantomJS stderr: ' + data);
        });

        command.on('exit', function(code) {
          if(code === 0){
            var outFile = htmlFile.replace('.html', '-' + testWidth + '.out'),
                outContents = fs.readFileSync(outFile),
                styles = JSON.parse(outContents);
            callback.call(that, styles);
            // Delete html, output file
            [outFile, htmlFile].forEach(fs.unlinkSync);
          };
        });
      };
    });
  }else if(Meteor.isClient){
    Meteor.call('extractStyles', this._id, function(error, result){
      if(error){
        console.log('extractStyles Failed!', error, result);
        return;
      };
      callback.call(that, result);
    });
  };
};

TestCases.TestCase.prototype.setNormative = function(value){
  var that = this;
  if(Meteor.isServer){
    if(value === undefined){
      // If no normative is spec'd then grab current
      this.extractStylesAsync(Meteor.bindEnvironment(function(result){
        that.setNormative(result);
      }));
      return;
    };

    var id = Random.id();
    var insertData = {
      _id: id,
      testCase: this._id,
      owner: this.owner,
      timestamp: Date.now(),
      value: value
    }
    TestNormatives.insert(insertData);
    return id;
  }else if(Meteor.isClient){
    Meteor.call('setNormative', {id: this._id, value: value}, function(error, result){
      if(error){
        console.log('setNormative Failed!', error, result);
        return;
      };
    });
  };
};

TestCases.TestCase.prototype.normativeCursor = function(){
  return TestNormatives.find({testCase: this._id}, {sort: {timestamp:-1}});
};

TestCases.TestCase.prototype.loadLatestNormative = function(){
  return this.normativeCursor().limit(1).fetch();
};

TestCases.TestCase.prototype.loadAllNormatives = function(){
  return this.normativeCursor().fetch();
};
