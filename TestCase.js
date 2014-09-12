/*
 * TestCase Class - same interface client and server
 *
 * TestCase.getHTML(options, function(err, result){})
 * TestCase.extractStyles(function(err, value){})
 * TestCase.setNormative(value, function(err, result){})
 * TestCase.loadLatestNormative(function(err, normative[]){})
    - Callback only required on client, sync'd return on server
 * TestCase.loadAllNormatives(function(err, normative[]){})
    - Callback only required on client, sync'd return on server
 * TestCase.run(function(err, report){})
 *
 */
TestCases.TestCase = function(id){
  if(id === undefined){
    this.notFound = true;
    return;
  }else{
    var data = TestCases.findOne(id);
    // NOTE: checking data.owner not necessary due to query in Meteor.publish
    if(data === undefined){
      this.notFound = true;
      return;
    };
  };

  extendData(this, data);
};

var extendData = function(obj, data){
  _.extend(obj, data);

  // Convert widths string into array
  if(obj.widths){
    obj.widthsArray = obj.widths.split(',').map(function(width){
      return parseInt(width.trim(), 10);
    });
  };
};

TestCases.TestCase.prototype.setData = function(data, callback){
  var that = this;
  if(Meteor.isServer){
    // Require new normative if these fields change
    ['cssFiles', 
     'widths', 
     'testURL',
     'fixtureHTML', 
     'remoteStyles'].forEach(function(field){
      if(data[field] !== undefined && data[field] !== that[field]){
        data.hasNormative = false;
      };
    });
    // Update nextRun if interval changes
    if(data.interval !== undefined && data.interval !== that.interval){
      if(data.interval === ''){
        data.nextRun = undefined;
      }else{
        // Last run or current time + interval
        data.nextRun = (that.lastRun ? that.lastRun : Date.now()) +
                        (parseInt(data.interval, 10) * 1000 * 60);
      };
    };

    TestCases.update(this._id, {$set: data}, {}, function(error, result){
      extendData(that, data);
      if(callback){
        callback.call(this, error, result);
      };
    });
  }else if(Meteor.isClient){
    Meteor.call('setData', {id: this._id, data: data}, function(error, result){
      if(error){
        console.log('setData Failed!', error, result);
      };
      if(callback){
        callback.call(that, error, result);
      };
    });
  };
};

var stylesheetFromNormative = function(normative, diff){
  var elements = flattenArray(normative),
      style = ['<style>'];
  elements.forEach(function(element){
    if(diff){
      diff.forEach(function(diffItem){
        if(diffItem.selector === element.selector){
          diffItem.instances.forEach(function(instance){
            element.attributes[instance.key] = instance.bVal;
          });
        };
      });
    };
    var rule = element.selector + '{';
    _.each(element.attributes, function(val, key){
      rule += key + ': ' + val + '; ';
    });
    rule += '}';
    style.push(rule);
  });
  style.push('</style>');
  return style.join('\n');
};

TestCases.TestCase.prototype.stylesheetsFromUrl = function(url, callback){
  var that = this;
  if(Meteor.isServer){
    var phantomjs = Npm.require('phantomjs');
    var shell = Npm.require('child_process');
    var command = shell.spawn(phantomjs.path, 
      ['assets/app/phantom/getSheetsFromUrl.js', url]);
    var stdout = '', stderr = '';

    command.stdout.on('data', function(data){
      stdout += data;
    });

    command.stderr.on('data', function(data){
      stderr += data;
    });

    command.on('exit', function(code) {
      if(callback){
        if(stdout.substr(0,9) === '##ERROR##'){
          callback.call(that, 1, undefined);
        }else{
          callback.call(that, stderr.length > 0 ? stderr : undefined, 
                              stdout.length > 0 ? stdout : undefined);
        };
      };
    });
  }else if(Meteor.isClient){
    Meteor.call('stylesheetsFromUrl', {id: that._id, url: url}, function(error, result){
      if(callback){
        if(typeof result === 'string' && result.substr(0,9) === '##ERROR##'){
          error = result.substr(9);
          result = undefined;
        };
        callback.call(that, error, result);
      };
    });
  };
};

TestCases.TestCase.prototype.getHTML = function(options, callback){
  var that = this;
  options = _.defaults(options || {}, {
    fixtureHTML: this.fixtureHTML,
    normativeValue: undefined,
    diff: undefined
  });

  var head = '';
  // Split out post-async code
  var finishOutput = function(head){
    if(options.normativeValue === undefined){
      if(head === undefined){
        head = '';
      };
      // Use spec'd css
      var linkTags = [];
      that.cssFiles.split('\n').forEach(function(href){
        if(href.trim() !== ''){
          linkTags.push('<link href="' + href + 
                        (href.indexOf('?') === -1 ? '?' + Date.now() : '')+ 
                        '" type="text/css" rel="stylesheet" />');
        };
      });
      head += linkTags.join('\n');
    }else{
      // Styles are coming from expectations
      head = stylesheetFromNormative(options.normativeValue, options.diff);
    };
    head = [
     '<head>',
     head,
     '<style>',
     '.steez-highlight-failure { outline: 2px solid #ff0 !important; }',
     '</style>',
     '</head>'].join('\n');
    var frameHTML = options.fixtureHTML;
    if(!/\<body[^]+\<\/body\>/i.test(frameHTML)){
      // Fixture HTML doesn't contain a <body> element
      frameHTML = '<body test-ignore>' + frameHTML + '</body>';
    };
    if(!/\<html[^]+\<\/html\>/i.test(frameHTML)){
      // Fixture HTML doesn't contain a <html> element
      frameHTML = '<html test-ignore>' + head + frameHTML + '</html>';
    }else{
      // Place <head> before <body>
      var bodyPos = frameHTML.toLowerCase().indexOf('<body');
      frameHTML = frameHTML.substr(0, bodyPos) + head + frameHTML.substr(bodyPos);
    };
    if(callback){
      callback.call(that, undefined, frameHTML);
    };
    return frameHTML;
  };
  // Begin possible async
  if(options.normativeValue === undefined){
    // Grab stylesheets from remote url
    if(this.remoteStyles){
      head = this.stylesheetsFromUrl(this.remoteStyles, function(error, result){
        if(error){
          if(callback){
            callback.call(that, 'Error loading remote URL.', undefined);
          };
        }else{
          finishOutput(result);
        };
      });
    }else{
      return finishOutput();
    };
  }else{
    return finishOutput();
  };
};

TestCases.TestCase.prototype.extractStyles = function(callback){
  var that = this;
  if(Meteor.isServer){
    var phantomjs = Npm.require('phantomjs');
    var shell = Npm.require('child_process');
    var fs = Npm.require('fs');
    var htmlFile = 'test-' + this._id + '.html';
    this.getHTML({}, function(error, result){
      fs.writeFile(htmlFile, result, function(err) {
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
          var cmdOutput = '', commands = [];
          that.widthsArray.forEach(function(testWidth){
            command = shell.spawn(phantomjs.path, 
              ['assets/app/phantom/extractStyles.js', 
               htmlFile, 
               testWidth,
               that.testURL ? that.testURL : 'http://localhost/' ]);
            commands.push(command);

            ['stdout', 'stderr'].forEach(function(outVar){
              command[outVar].on('data', function(data){
                console.log('PhantomJS ' + outVar + ': ' + data);
                cmdOutput += data;
                commands.forEach(function(cmd){
                  cmd.kill('SIGKILL');
                });
              });
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
                if(callback){
                  callback.call(that, cmdOutput, undefined);
                  callback = undefined;
                };
              };
            });
          });
        };
      });
    });
  }else if(Meteor.isClient){
    Meteor.call('extractStyles', {id: this._id}, function(error, result){
      if(typeof result === 'string' && result.substr(0,9) === '##error##'){
        if(callback){
          callback.call(that, result.substr(9), undefined);
        };
      }else{
        if(callback){
          callback.call(that, undefined, result);
        };
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
          fut['return']('##error##' + error);
          return;
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
      if(typeof result === 'string' && result.substr(0,9) === '##error##'){
        if(callback){
          callback.call(that, result.substr(9), undefined);
        };
      }else{
        if(callback){
          callback.call(that, undefined, result);
        };
      };
    });
  };
};

if(Meteor.isServer){
  var loadNormatives = function(options, query){
    options = _.defaults(options || {}, {
      sort: {timestamp:-1}
    });
    query = _.defaults(query || {}, {testCase: this._id});
    return TestNormatives.find(query, options).fetch();
  };

  TestCases.TestCase.prototype.loadLatestNormative = function(){
    return loadNormatives.call(this, {limit: 1});
  };

  TestCases.TestCase.prototype.loadNormative = function(id){
    return loadNormatives.call(this, {limit: 1}, {_id: id});
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
        };
        if(callback){
          callback.call(that, error, result);
        };
      });
    };
  });
  // Methods that have a parameter
  ['loadNormative'].forEach(function(func){
    TestCases.TestCase.prototype[func] = function(options, callback){
      var that = this;
      Meteor.call(func, {id: this._id, options: options}, function(error, result){
        if(error){
          console.log(func + ' Failed!', error, result);
        };
        if(callback){
          callback.call(that, error, result);
        };
      });
    };
  });

};

var flattenArray = function(a){
  a = _.map(a, _.clone);
  var b = [];
  a.forEach(function(item){
    if(item.children && item.children.length){
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
    if(!a[i].ignore){
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
            'bVal': bVal,
            'aRules': a[i].rules,
            'bRules': b[i].rules
          });
        };
      });
    };
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
    if(!this.hasNormative || normative.length === 0){
      if(callback){
        callback.call(that, 'No normative exists!', undefined);
      };
      return;
    };

    this.extractStyles(Meteor.bindEnvironment(function(error, styles){
      if(error){
        if(callback){
          callback.call(that, error, undefined);
        };
        return;
      };
      var failures = {}, errorOccurred = false;
      _.each(styles, function(viewStyles, viewWidth){
        if(normative[0].value[viewWidth] === undefined){
          if(callback){
            callback.call(that, 'Normative widths mismatch!', undefined);
          };
          errorOccurred = true;
        };
        try{
          failures[viewWidth] = compareStyles(normative[0].value[viewWidth], viewStyles);
        }catch(error){
          if(callback){
            callback.call(that, error, undefined);
          };
          errorOccurred = true;
        };
      });
      if(errorOccurred){
        return;
      };
      
      var totalFailures = 0;
      _.each(failures, function(viewFailures, viewWidth){
        totalFailures += viewFailures.length;
      });
      var report = {time: new Date(), 
                    passed: totalFailures === 0,
                    _id: Random.id(),
                    normative: normative[0]._id,
                    fixtureHTML: that.fixtureHTML,
                    owner: that.owner,
                    testCase: that._id,
                    failures: failures};
      TestHistory.insert(report, function(error, result){
        if(error){
          console.log('TestHistory Insertion Error', error);
        };
      });

      var metaAttr = {
        lastPassed: report.passed,
        lastRun: Date.now()
      };
      if(that.interval){
        metaAttr.nextRun = metaAttr.lastRun + (parseInt(that.interval, 10) * 1000 * 60);
      };
      that.setData(metaAttr, function(error, result){
        if(callback){
          callback.call(that, error, report);
        };
      });
    }));
  }else if(Meteor.isClient){
    Meteor.call('run', {id: this._id, options: options}, function(error, result){
      if(typeof result === 'string' && result.substr(0,9) === '##ERROR##'){
        if(callback){
          callback.call(that, result.substr(9), undefined);
        };
      }else{
        if(callback){
          callback.call(that, undefined, result);
        };
      };
    });
  };
};


