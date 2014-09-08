Template.details.test = function(){
  var test = new TestCases.TestCase(Session.get("selected"));
  if(test.notFound){
    return;
  };
  if(test.history){
    var history = test.history = test.history.reverse();
    
    var objToArray = function(obj){
      var arr = [];
      _.each(obj, function(item){
        if(arr.length === 0){
          item['first'] = true;
        };
        arr.push(item);
      });
      return arr;
    };
    var organizeBySelector = function(arr){
      var out = {};
      arr.forEach(function(failure){
        if(!out.hasOwnProperty(failure['selector'])){
          out[failure['selector']] = {
            selector: failure['selector'],
            instances: []
          };
        };
        out[failure['selector']].instances.push(failure);
      });
      return objToArray(out);
    };


    history.forEach(function(testStatus){
      _.each(testStatus.failures, function(elements, width){
        testStatus.failures[width] = {elements: organizeBySelector(elements),
                                      width: width,
                                      runId: testStatus.id};
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

      test.loadNormative(testStatus.normative, function(error, result){
        if(error){
          throw error;
        };
        _.each(testStatus.failures, function(failure){
          test.getHTML({
            fixtureHTML: testStatus.fixtureHTML,
            normativeValue: result[0].value[failure.width]
          },function(error, result){
            Session.set('expected-' + testStatus.id + '-' + failure.width, result);
          });

          test.getHTML({
            fixtureHTML: testStatus.fixtureHTML,
            normativeValue: result[0].value[failure.width],
            diff:  failure.elements
          }, function(error, result){
            Session.set('reported-' + testStatus.id + '-' + failure.width, result);
          });
        });
      });
    });
  };
  return test;
};

Template.details.testVar = function(data){
  var fieldName = data['hash']['field'],
      test = Template.details.test();
  return test[fieldName];
};

Template.details.widthList = function(){
  var test = this;
  var output = [];
  this.widthsArray.forEach(function(width){
    output.push({width:width, _id: test._id, first: output.length === 0});
  });
  return output;
};

Template.details.fillFrame = function(){
  var test = this;
  if(test.notFound){
    return;
  };
  setTimeout(function(){
    test.getHTML({}, function(error, result){
      Session.set('settings-error-'+test._id, error);
      if(!error){
        test.widthsArray.forEach(function(width){
          var frameId = 'test-frame-' + test._id + '-' + width,
              frameDoc = document.getElementById(frameId).contentWindow.document;
          frameDoc.open();
          frameDoc.write(result);
          frameDoc.close();
        });
      };
    });
  }, 10);
};

Template.details.expanded = function(){
  return Session.get('failure-expanded-'+this.id);
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
        $el = $(e.currentTarget);
    $el.parent().addClass('loading').find('button').addClass('disabled');
    this.run(function(error, result){
      $el.parent().removeClass('loading').find('button').removeClass('disabled');
      Session.set('run-error-' + test._id, error);
    });
  },
  'click button.extract': function(e){
    var test = this,
        $el = $(e.currentTarget);
    $el.parent().addClass('loading').find('button').addClass('disabled');
    this.setNormative(function(error, result){
      $el.parent().removeClass('loading').find('button').removeClass('disabled');
      Session.set('run-error-' + test._id, error);
    });
  },
  'click a.expand-details': function(event){
    var key = 'failure-expanded-' + this.id,
        expanded = Session.get(key);
    Session.set(key, !expanded);
    event.preventDefault();
  }
});

Template.historyDetails.fillFrame = function(){
  var failure = this,
      frames = ['expected-' + failure.runId + '-' + failure.width,
                'reported-' + failure.runId + '-' + failure.width],
      htmlReady = Session.get(frames[0]);
  if(htmlReady){
    setTimeout(function(){
      frames.forEach(function(frameId){
        var frameDoc = document.getElementById(frameId).contentWindow.document;
        frameDoc.open();
        frameDoc.write(Session.get(frameId));
        frameDoc.close();
      });
    }, 10);
  };
};

Template.historyDetails.events({
  'click a.failure-el': function(event){
    event.preventDefault();
    var failure = this,
        selector = $(event.currentTarget).parent().attr('data-selector'),
        frames = ['expected-' + failure.runId + '-' + failure.width,
                  'reported-' + failure.runId + '-' + failure.width],
        failureClass = 'steez-highlight-failure';
    frames.forEach(function(frameId){
      var $frameDoc = $('#' + frameId).contents(),
          $el = $frameDoc.find(selector);
      $frameDoc.find('.' + failureClass).removeClass(failureClass);
      $el.addClass(failureClass);
    });
  }
});
