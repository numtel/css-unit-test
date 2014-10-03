var loadedTests = {};

Template.details.test = function(){
  var testId = Session.get('selected');
  if(testId){
    var sessionVar = 'loadedTest:' + testId;
    var loaded = Session.get(sessionVar);
    if(!loaded){
      Session.set(sessionVar, 'loading');
      ServerObject('CssTest', testId, function(error, result){
        if(error) throw error;
        loadedTests[testId] = result;
        Session.set(sessionVar, 'ready');
      });
      return undefined;
    };
  };
  return CssTests.findOne(testId);
};

var testInstance = function(){
  var testId = Session.get('selected');
  if(testId){
    var sessionVar = 'loadedTest:' + testId;
    var loaded = Session.get(sessionVar);
    if(loaded==='ready'){
      return loadedTests[testId];
    };
  };
};

Template.details.historyItems = function(){
  var test = this;
  return CssHistory.find({testCase: test._id}, {
          sort: {time: -1},
          limit: 100,
          fields: {passed: 1, time: 1, testCase: 1}
        });
};

Template.details.hasHistoryItems = function(){
  return Template.details.historyItems.call(this).count() > 0;
};

Template.details.testVar = function(data){
  var fieldName = data['hash']['field'],
      test = Template.details.test();
  return test[fieldName];
};

Template.details.widthList = function(){
  var test = this;
  var sessionVar = 'widthsArray:' + test._id;
  var loaded = Session.get(sessionVar);
  if(!loaded){
    var instance = testInstance();
    if(instance){
      Session.set(sessionVar, instance.widthsArray); 
    };
  }else{
    var output = [];
    loaded.forEach(function(width){
      output.push({width:width, testId: test._id, first: output.length === 0});
    });
    return output;
  };
};

Template.details.fillFrame = function(){
  var test = this;
  var instance = testInstance();
  if(!instance) return;
  setTimeout(function(){
    instance.getHtml(function(error, result){
      Session.set('settings-error-'+test._id, error);
      if(!error){
        instance.widthsArray.forEach(function(width){
          var frameId = 'test-frame-' + test._id + '-' + width,
              frame = document.getElementById(frameId);
          if(frame){
            var frameDoc = frame.contentWindow.document;
            frameDoc.open();
            frameDoc.write(result);
            frameDoc.close();
          };
        });
      };
    });
  }, 10);
};

Template.details.expanded = function(){
  return Session.get('failure-expanded-'+this._id);
};

Template.details.settingsError = function(){
  return Session.get('settings-error-'+this._id);
};

Template.details.runError = function(){
  return Session.get('run-error-'+this._id);
};

Template.details.events({
  'click button.run': function(e){
    var test = this,
        instance = testInstance(),
        $el = $(e.currentTarget);
    if(!instance) return;
    $el.parent().addClass('loading').find('button').addClass('disabled');
    instance.run(function(error, result){
      $el.parent().removeClass('loading').find('button').removeClass('disabled');
      Session.set('run-error-' + test._id, error);
    });
  },
  'click button.extract': function(e){
    var test = this,
        instance = testInstance(),
        $el = $(e.currentTarget),
        $parent = $el.parent();
    if(!instance) return;
    $parent.addClass('loading').find('button').addClass('disabled');
    this.setNormative(function(error, result){
      $parent.removeClass('loading').find('button').removeClass('disabled');
      Session.set('run-error-' + test._id, error);
    });
  },
  'click a.expand-details': function(event){
    var key = 'failure-expanded-' + this._id,
        expanded = Session.get(key);
    Session.set(key, !expanded);
    event.preventDefault();
  }
});

Template.historyDetails.fullHistoryItem = function(){
  var objToArray = function(obj){
    var arr = [];
    _.each(obj, function(item, key){
      if(typeof item !== 'object'){
        item = {
          value: item
        };
      };
      if(arr.length === 0){
        item['first'] = true;
      };
      if(arr.key === undefined){
        item['key'] = key;
      };
      arr.push(item);
    });
    return arr;
  };
  var organizeBySelector = function(arr){
    var out = {};
    arr.forEach(function(failure){
      if(!out.hasOwnProperty(failure['selector'])){
        ['aRules', 'bRules'].forEach(function(reorgKey){
          if(failure[reorgKey] && failure[reorgKey].length){
            if(failure['ruleSets'] === undefined){
              failure['ruleSets'] = [];
            };
            failure[reorgKey].forEach(function(rule){
              rule.attributes = objToArray(rule.attributes);
            });
            failure['ruleSets'].push({
              expected: reorgKey === 'aRules',
              reported: reorgKey === 'bRules',
              rules: failure[reorgKey]
            });
          };
        });
        out[failure['selector']] = {
          selector: failure['selector'],
          ruleSets: failure['ruleSets'],
          instances: []
        };
      };
      out[failure['selector']].instances.push(failure);
    });
    return objToArray(out);
  };

  var testStatus = CssHistory.findOne(this._id),
      test = Template.details.test(),
      instance = testInstance();
  if(!instance) return;
  _.each(testStatus.failures, function(elements, width){
    testStatus.failures[width] = {elements: organizeBySelector(elements),
                                  width: width,
                                  runId: testStatus._id};
    testStatus.failures[width].elements.forEach(function(element){
      // Propagate values to children
      ['width', 'runId'].forEach(function(key){
        element[key] = testStatus.failures[width][key];
      });
    });
  });
  testStatus.failures = objToArray(testStatus.failures);

  // Remove view widths without failures
  var activeFailures = [];
  testStatus.failures.forEach(function(failure){
    if(failure.elements.length > 0){
      if(activeFailures.length === 0){
        failure.first = true;
      };
      activeFailures.push(failure);
    };
  });
  testStatus.failures = activeFailures;

  instance.loadNormative(testStatus.normative, function(error, result){
    if(error){
      throw error;
    };
    _.each(testStatus.failures, function(failure){
      instance.getHtml({
        fixtureHtml: testStatus.fixtureHtml,
        normativeValue: result[0].value[failure.width]
      },function(error, result){
        Session.set('expected-' + testStatus._id + '-' + failure.width, result);
      });

      instance.getHtml({
        fixtureHtml: testStatus.fixtureHtml,
        normativeValue: result[0].value[failure.width],
        diff:  failure.elements
      }, function(error, result){
        Session.set('reported-' + testStatus._id + '-' + failure.width, result);
      });
    });
  });
  return testStatus;
};


Template.historyDetails.fillFrame = function(){
  var failure = this,
      frames = ['expected-' + failure.runId + '-' + failure.width,
                'reported-' + failure.runId + '-' + failure.width],
      htmlReady = Session.get(frames[0]);
  if(htmlReady){
    setTimeout(function(){
      frames.forEach(function(frameId){
        var frame = document.getElementById(frameId);
        if(frame){
          var frameDoc = frame.contentWindow.document;
          frameDoc.open();
          frameDoc.write(Session.get(frameId));
          frameDoc.close();
        };
      });
    }, 10);
  };
};

Template.historyDetails.events({
  'click a.failure-el': function(event){
    event.preventDefault();
    var failure = this,
        selector = $(event.currentTarget).closest('li').attr('data-selector'),
        frames = ['expected-' + failure.runId + '-' + failure.width,
                  'reported-' + failure.runId + '-' + failure.width],
        failureClass = 'steez-highlight-failure';
    frames.forEach(function(frameId){
      var $frameDoc = $('#' + frameId).contents(),
          $el = $frameDoc.find(selector);
      $frameDoc.find('.' + failureClass).removeClass(failureClass);
      $el.addClass(failureClass);
    });
  },
  'click .rule-tabs a': function(event){
    event.preventDefault();
    var $el = $(event.currentTarget),
        $parent = $el.closest('li[data-selector]'),
        newActive = $el.attr('href').substr(1);
    $parent.children('.computed.active, .rule-set.active').removeClass('active');
    $parent.children('.' + newActive).addClass('active');
  }
});
