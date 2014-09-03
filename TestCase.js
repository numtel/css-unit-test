/*
 * TestCase Class
 *
 * TestCase.getHTML()
 * TestCase.extractStylesAsync(function(value){})
 * TestCase.setNormative(value)
 * TestCase.loadLatestNormative(function(normative[]){})
    - Callback only on client, sync'd on server
 * TestCase.loadAllNormatives(function(normative[]){})
    - Callback only on client, sync'd on server
 *
 */
TestCases.TestCase = function(id){
  if(id === undefined){
    // TODO: Prepare new TestCase
  }else{
    var data = TestCases.findOne(id);
    if(data === undefined){
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
    var phantomjs = Npm.require('phantomjs');
    var shell = Npm.require('child_process');
    var fs = Npm.require('fs');
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
            callback.call(that, undefined, styles);
            // Delete html, output file
            [outFile, htmlFile].forEach(fs.unlinkSync);
          }else{
            callback.call(that, code, undefined);
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
      callback.call(that, error, result);
    });
  };
};

TestCases.TestCase.prototype.setNormative = function(value){
  var that = this;
  if(Meteor.isServer){
    if(value === undefined){
      // If no normative is spec'd then grab current
      this.extractStylesAsync(Meteor.bindEnvironment(function(error, result){
        if(error){
          throw error;
        };
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

if(Meteor.isServer){
  var loadNormatives = function(options){
    _.extend({
      sort: {timestamp:-1}
    }, options);
    return TestNormatives.find({testCase: this._id}, options).fetch();
  };

  TestCases.TestCase.prototype.loadLatestNormative = function(){
    return loadNormatives.call(this, {limit: 1});
  };

  TestCases.TestCase.prototype.loadAllNormatives = function(){
    return loadNormatives.call(this);
  };
}else if(Meteor.isClient){
  // Basic methods that only require the id to be sent
  ['loadLatestNormative', 'loadAllNormatives'].forEach(function(func){
    TestCases.TestCase.prototype[func] = function(callback){
      var that = this;
      Meteor.call(func, {id: this._id}, function(error, result){
        if(error){
          console.log(func + ' Failed!', error, result);
          return;
        };
        callback.call(that, error, result);
      });
    };
  });
};

var flattenArray = function(a){
  var b = [];
  a.forEach(function(item){
    if(item.children.length){
      var recursed = flattenArray(item.children);
      b = b.concat(recursed);
    };
    item.children = undefined;
  });
  return a.concat(b);
};

var compareStyles = function(a, b){
  var filterRules = [];
  var failures = [];

  // Do this without recursion
  a=flattenArray(a);
  b=flattenArray(b);

  if(a.length !== b.length){
    throw 'Fixture changed! New normative needed!';
  };

  for(var i = 0; i<a.length; i++){
    _.each(a[i].attributes, function(aVal, key){
      var skip;
      filterRules.forEach(function(rule){
        if(rule.test(key)){
          skip = true;
        };
      });
      if(skip){
        return;
      };
      var bVal = b[i].attributes[key];
      if(bVal !== aVal){
        failures.push({
          'selector': a[i].selector,
          'key': key,
          'aVal': aVal,
          'bVal': bVal
        });
      };
    });
  };
  return failures;
};

TestCases.TestCase.prototype.run = function(options, callback){
  var that = this;
  if(Meteor.isServer){
    if(typeof options !== 'object'){
      options = {};
    };
    if(options.widths === undefined){
      options.widths = this.widths;
    };

    var normative = this.loadLatestNormative();
    if(normative.length === 0){
      throw 'No normative exists!';
    };

    this.extractStylesAsync(Meteor.bindEnvironment(function(error, styles){
      if(error){
        throw error;
      };
      var failures = compareStyles(normative[0].value, styles);
      
      var report = {time: new Date(), 
                    passed: failures.length === 0,
                    failures: failures};
      if(that.history !== undefined && that.history.length !== undefined){
        TestCases.update(that._id, {$push: {history: report}});
      }else{
        TestCases.update(that._id, {$set: {history: [report]}});
      };
      TestCases.update(that._id, {$set: {lastPassed: report.passed}});
      callback.call(that, undefined, report);
    }));
  }else if(Meteor.isClient){
    if(typeof options === 'function'){
      // Options ommitted
      callback = options;
      options = {};
    };
    Meteor.call('run', {id: this._id, options: options}, function(error, result){
      if(error){
        console.log('Run Failed!', error, result);
        console.log(error.get_stack());
      };
      callback.call(that, error, result);
    });
  };
};
