/*
 * TestCase Class
 *
 * TestCase.getHTML()
 * TestCase.extractStyles(function(err, value){})
 * TestCase.setNormative(value, function(err, result){})
 * TestCase.loadLatestNormative(function(err, normative[]){})
    - Callback only required on client, sync'd return on server
 * TestCase.loadAllNormatives(function(err, normative[]){})
    - Callback only required on client, sync'd return on server
 * TestCase.run(function(err, report){})
 * TestCase.getHistory(function(err, history){})
 *
 */
TestCases.TestCase = function(id){
  if(id === undefined){
    // TODO: Prepare new TestCase
  }else{
    var data = TestCases.findOne(id);
    if(data === undefined || data.owner !== Meteor.userId()){
      this.notFound = true;
      return;
    };
  };

  _.extend(this, data);
  // Convert widths string into array
  this.widthsArray = this.widths.split(',').map(function(width){
    return parseInt(width.trim(), 10);
  });
};

TestCases.TestCase.prototype.setData = function(data, callback){
  var that = this;
  if(Meteor.isServer){
    // Require new normative if these fields change
    ['cssFiles', 'widths', 'fixtureHTML'].forEach(function(field){
      if(data[field] !== undefined && data[field] !== that[field]){
        data.hasNormative = false;
      };
    });

    TestCases.update(this._id, {$set: data}, {}, function(error, result){
      if(callback){
        callback.call(this, error, result);
      };
    });
  }else if(Meteor.isClient){
    Meteor.call('setData', {id: this._id, data: data}, function(error, result){
      if(error){
        console.log('setData Failed!', error, result);
        return;
      };
      if(callback){
        callback.call(that, error, result);
      };
    });
  };
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

TestCases.TestCase.prototype.extractStyles = function(callback){
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
        var returned = {}, returnCount = 0;
        var phantomReturn = function(width, styles){
          returned[width] = styles;
          returnCount++;
          if(returnCount === that.widthsArray.length){
            // Delete html file
            fs.unlink(htmlFile);
            if(callback){
              callback.call(that, undefined, returned);
            };
          };
        };
        that.widthsArray.forEach(function(testWidth){
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
              phantomReturn(testWidth, styles);
              // Delete output file
              fs.unlink(outFile);
            }else{
              throw 'PhantomJS Error ' + code;
            };
          });
        });
      };
    });
  }else if(Meteor.isClient){
    Meteor.call('extractStyles', {id: this._id}, function(error, result){
      if(error){
        console.log('extractStyles Failed!', error, result);
        return;
      };
      if(callback){
        callback.call(that, error, result);
      };
    });
  };
};

TestCases.TestCase.prototype.setNormative = function(value, callback){
  var that = this;
  if(typeof value === 'function'){
    // Value ommitted, only callback supplied
    callback = value;
    value = undefined;
  };
  if(Meteor.isServer){
    if(value === undefined){
      // If no normative is spec'd then grab current
      var Future = Npm.require('fibers/future');
      var fut = new Future();
      this.extractStyles(Meteor.bindEnvironment(function(error, result){
        if(error){
          throw error;
        };
        fut['return'](that.setNormative(result, callback));
      }));
      return fut.wait();
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
    TestCases.update(that._id, {$set: {hasNormative: true}});
    if(callback){
      callback.call(that, error, result);
    };
    return id;
  }else if(Meteor.isClient){
    Meteor.call('setNormative', {id: this._id, value: value}, function(error, result){
      if(error){
        console.log('setNormative Failed!', error, result);
        return;
      };
      if(callback){
        callback.call(that, error, result);
      };
    });
  };
};

if(Meteor.isServer){
  var loadNormatives = function(options){
    options = _.extend(options || {}, {
      sort: {timestamp:-1}
    });
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
        if(callback){
          callback.call(that, error, result);
        };
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
  if(typeof options === 'function'){
    // Options ommitted, only callback supplied
    callback = options;
    options = {};
  };
  if(Meteor.isServer){
    if(typeof options !== 'object'){
      options = {};
    };
    // Currently, no options to set...

    var normative = this.loadLatestNormative();
    if(normative.length === 0){
      throw 'No normative exists!';
    };

    this.extractStyles(Meteor.bindEnvironment(function(error, styles){
      if(error){
        throw error;
      };
      var failures = {};
      _.each(styles, function(viewStyles, viewWidth){
        if(normative[0].value[viewWidth] === undefined){
          throw 'Normative widths mismatch!';
        };
        failures[viewWidth] = compareStyles(normative[0].value[viewWidth], viewStyles);
      });
      
      var totalFailures = 0;
      _.each(failures, function(viewFailures, viewWidth){
        totalFailures += viewFailures.length;
      });
      var report = {time: new Date(), 
                    passed: totalFailures === 0,
                    id: Random.id(),
                    normative: normative[0]._id,
                    fixtureHTML: that.fixtureHTML,
                    failures: failures};
      if(that.history !== undefined && that.history.length !== undefined){
        TestCases.update(that._id, {$push: {history: report}});
      }else{
        TestCases.update(that._id, {$set: {history: [report]}});
      };
      TestCases.update(that._id, {$set: {lastPassed: report.passed}});
      if(callback){
        callback.call(that, undefined, report);
      };
    }));
  }else if(Meteor.isClient){
    Meteor.call('run', {id: this._id, options: options}, function(error, result){
      if(error){
        console.log('Run Failed!', error, result);
        console.log(error.get_stack());
      };
      if(callback){
        callback.call(that, error, result);
      };
    });
  };
};


TestCases.TestCase.prototype.getHistory = function(callback){
  var that = this;
  if(Meteor.isServer){
    if(callback){
      callback.call(that, undefined, this.history);
    };
    return this.history;
  }else if(Meteor.isClient){
    Meteor.call('getHistory', {id: this._id}, function(error, result){
      if(callback){
        callback.call(that, error, result);
      };
    });
  };
};
