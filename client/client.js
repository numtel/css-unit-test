TestCases = new Meteor.Collection('TestCases');

var testCasesHandle;
Deps.autorun(function () {
  testCasesHandle = Meteor.subscribe('TestCases');
});

UI.registerHelper('logThis', function(){
  console.log(this);
});

UI.registerHelper('loggedIn', function () {
  return Meteor.userId() != null;
});

UI.registerHelper('showModifyDialog', function () {
  return Session.get("showModifyDialog");
});

UI.registerHelper('showDeleteDialog', function () {
  return Session.get("showDeleteDialog");
});

UI.registerHelper('createTestDialogOpen', function() {
  return Session.get('showModifyDialog') && 
         Session.get('modifyDialogType') === 'create';
});

UI.registerHelper('testSelected', function(){
  return Session.get('selected');
});

UI.registerHelper('loading', function () {
  return !testCasesHandle.ready();
});

Template.list.renderSortable = function(){
  setTimeout(function(){
    $('#tests-list').sortable({
      handle: 'a',
      stop: function(event, ui){
        ui.item.parent().children().each(function(i){
          var item = $(this),
              id = item.children('a').attr('data-id');
          TestCases.update(id, {$set: {rank: i}});
        });
      }
    });
  }, 10);
};

Template.list.tests = function(){
  return TestCases.find({}, {
    sort: {rank: 1},
    fields: {title: 1, hasNormative:1, lastPassed:1}
  });
};

Template.list.empty = function(){
  return TestCases.find().count() === 0;
};

Template.list.active = function () {
  return Session.equals("selected", this._id) ? " active " : '';
};

var setSelected = function(id){
  if(id !== Session.get('selected')){
    Session.set('selected', id);
    Session.set('history', undefined);
    window.history.pushState('','',id);
  };
  Session.set('showModifyDialog', false);
  Session.set('modifyDialogType', 'edit');
};

Template.list.events({
  'click a.test': function(event, template){
    setSelected(this._id);
    event.preventDefault();
  },
  'click a.create': function (event) {
    Session.set("modifyDialogError", null);
    Session.set("modifyDialogType", 'create');
    Session.set("showModifyDialog", true);
    event.preventDefault();
  }
});

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
          var expected = test.getHTML({
            fixtureHTML: testStatus.fixtureHTML,
            normativeValue: result[0].value[failure.width]
          });
          Session.set('expected-' + testStatus.id + '-' + failure.width, expected);
          var reported = test.getHTML({
            fixtureHTML: testStatus.fixtureHTML,
            normativeValue: result[0].value[failure.width],
            diff:  failure.elements
          });
          Session.set('reported-' + testStatus.id + '-' + failure.width, reported);
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
    test.widthsArray.forEach(function(width){
      var frameId = 'test-frame-' + test._id + '-' + width,
          frameDoc = document.getElementById(frameId).contentWindow.document;
      frameDoc.open();
      frameDoc.write(test.getHTML());
      frameDoc.close();
    });
  }, 10);
};

Template.details.expanded = function(){
  return Session.get('failure-expanded-'+this.id);
};

Template.details.events({
  'click button.run': function(e){
    var test = this,
        $el = $(e.currentTarget);
    $el.parent().addClass('loading').find('button').addClass('disabled');
    this.run(function(error, result){
      $el.parent().removeClass('loading').find('button').removeClass('disabled');
      if(result){
        // Update session array
        Template.details.test();
      };
    });
  },
  'click button.extract': function(e){
    var $el = $(e.currentTarget);
    $el.parent().addClass('loading').find('button').addClass('disabled');
    this.setNormative(function(error, result){
      $el.parent().removeClass('loading').find('button').removeClass('disabled');
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

Template.modifyDialog.isCreate = function(){
  return Session.get("modifyDialogType") ===  'create';
};

Template.modifyDialog.fieldValue = function(data){
  if(Template.modifyDialog.isCreate()){
    if(data['hash']['default']){
      return data['hash']['default'];
    };
    return '';
  };
  var fieldName = data['hash']['key'];
  return this[fieldName];
};


Template.modifyDialog.test =
Template.deleteDialog.test = function(){
  var test = new TestCases.TestCase(Session.get("selected"));
  if(test.notFound){
    return;
  };
  return test;
};

Template.modifyDialog.events({
  'click .duplicate': function(event, template){
    event.preventDefault();
    var test = Template.modifyDialog.test();
    template.find('.title').value = test.title;
    template.find('.description').value = test.description;
    template.find('.css-files').value = test.cssFiles;
    template.find('.fixture-html').value = test.fixtureHTML;
    template.find('.widths').value = test.widths;
  },
  'submit form': function (event, template) {
    event.preventDefault();
    var $form = $(event.currentTarget),
        $save = $form.find('button.save');
    $save.parent().addClass('loading');
    $save.addClass('disabled');
    var title = template.find(".title").value,
        description = template.find(".description").value,
        cssFiles = template.find(".css-files").value,
        fixtureHTML = template.find(".fixture-html").value,
        widths = template.find(".widths").value,
        isCreate = Template.modifyDialog.isCreate(),
        id;

    var postData = {
      title: title,
      description: description,
      cssFiles: cssFiles,
      widths: widths,
      fixtureHTML: fixtureHTML
    };

    if(isCreate){
      Meteor.call('createTest', postData, function(error, result){
        $save.parent().removeClass('loading');
        $save.removeClass('disabled');
        if(error){
          Session.set('modifyDialogError', error.reason);
        }else{
          setSelected(result);
          Session.set("showModifyDialog", false);
          Session.set("modifyDialogType", 'edit');
        };
      });
    }else{
      postData._id = this._id;
      Meteor.call('editTest', postData, function(error, result){
        $save.parent().removeClass('loading');
        $save.removeClass('disabled');
        if(error){
          Session.set('modifyDialogError', error.reason);
        }else{
          Session.set("showModifyDialog", false);
        };
      });
    };
  },

  'click .delete': function (event) {
    Session.set('showDeleteDialog', true);
    event.preventDefault();
  },

  'click .cancel': function (event) {
    Session.set("showModifyDialog", false);
    Session.set("modifyDialogType", 'edit');
    event.preventDefault();
  }
});

Template.modifyDialog.error = function () {
  return Session.get("modifyDialogError");
};


Template.deleteDialog.events({
  'click .delete': function (event, template) {
    event.preventDefault();
    TestCases.remove(this._id);
    Session.set("showDeleteDialog", false);
  },
  'click .cancel': function (event) {
    event.preventDefault();
    Session.set("showDeleteDialog", false);
  }
});

