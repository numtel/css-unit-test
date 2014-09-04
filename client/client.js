TestCases = new Meteor.Collection('TestCases');

var testCasesHandle;
Deps.autorun(function () {
  testCasesHandle = Meteor.subscribe('TestCases');
});

var openCreateDialog = function () {
  Session.set("modifyDialogError", null);
  Session.set("modifyDialogType", 'create');
  Session.set("showModifyDialog", true);
};

var openEditDialog = function () {
  Session.set("modifyDialogError", null);
  Session.set("modifyDialogType", 'edit');
  Session.set("showModifyDialog", true);
};

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

UI.registerHelper('logThis', function(){
  console.log(this);
});

UI.registerHelper('loading', function () {
  return !testCasesHandle.ready();
});
Template.list.tests = function(){
  return TestCases.find({}, {sort: {rank: 1}});
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
    Session.set('showModifyDialog', false);
    window.history.pushState('','',id);
  };
};

Template.list.events({
  'click a.test': function(event, template){
    var id = event.currentTarget.attributes.getNamedItem('data-id').value;
    setSelected(id);
    event.preventDefault();
  },
  'click a.create': function (event) {
    openCreateDialog();
    event.preventDefault();
  }
});

Template.details.test = function(noHistory){
  var test = new TestCases.TestCase(Session.get("selected"));
  if(test.notFound){
    return;
  };
  // Tranlate history data structure into one more template friendly
  var objToArray = function(obj){
    var arr = [];
    _.each(obj, function(item){
      arr.push(item);
    });
    return arr;
  };
  if(!noHistory){
    test.getHistory(function(error, history){
      if(history){
        history = history.reverse();
        
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
          });
          testStatus.failures = objToArray(testStatus.failures);
        });
        Session.set('history', history);
      };
    });
  };
  return test;
};

Template.details.testVar = function(data){
  var fieldName = data['hash']['field'],
      test = Template.details.test();
  return test[fieldName];
};

Template.details.history = function(){
  return Session.get('history');
};

Template.details.fillFrame = function(){
  var test = this;
  if(test.notFound){
    return;
  };
  setTimeout(function(){
    var frameId = 'test-frame-' + test._id,
        frameDoc = document.getElementById(frameId).contentWindow.document;
    frameDoc.open();
    frameDoc.write(test.getHTML());
    frameDoc.close();
  }, 10);
};

Template.details.events({
  'click button.run': function(e){
    var test = this,
        $el = $(e.currentTarget);
    $el.addClass('disabled');
    this.run(function(error, result){
      $el.removeClass('disabled');
      if(result){
        // Update session array
        Template.details.test();
      };
    });
  },
  'click button.extract': function(e){
    var $el = $(e.currentTarget);
    $el.addClass('disabled');
    this.setNormative(function(error, result){
      $el.removeClass('disabled');
    });
  },
  'click button.edit': openEditDialog,
  'click button.delete': function(){
    Session.set('showDeleteDialog', true);
  },
  'click a.expand-details': function(event){
    var $el = $(event.currentTarget),
        details = $el.parent().children('.details');
    details.toggleClass('show');
    $el.toggleClass('active').closest('li').toggleClass('expanded');
    event.preventDefault();
  }
});

Template.historyDetails.events({
  'click a.failure-el': function(event){
    var test = new TestCases.TestCase(Session.get('selected')),
        selector = $(event.currentTarget).parent().attr('data-selector'),
        frameId = 'test-frame-' + test._id,
        failureClass = 'failure-' + frameId,
        $frameDoc = $('#' + frameId).contents(),
        $el = $frameDoc.find(selector);
    $frameDoc.find('.' + failureClass).removeClass(failureClass);
    $el.addClass(failureClass);
    event.preventDefault();
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
    template.find('.title').value = this.title;
    template.find('.description').value = this.description;
    template.find('.css-files').value = this.cssFiles;
    template.find('.fixture-html').value = this.fixtureHTML;
    template.find('.widths').value = this.widths;
  },
  'click .save': function (event, template) {
    event.preventDefault();
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
        if(error){
          Session.set('modifyDialogError', error.reason);
        }else{
          setSelected(result);
          Session.set("showModifyDialog", false);
        };
      });
    }else{
      postData._id = this._id;
      Meteor.call('editTest', postData, function(error, result){
        if(error){
          Session.set('modifyDialogError', error.reason);
        }else{
          Session.set("showModifyDialog", false);
        };
      });
    };
  },

  'click .cancel': function (event) {
    Session.set("showModifyDialog", false);
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

