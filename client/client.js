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

Template.controls.loggedIn =
UI.body.loggedIn = function () {
  return Meteor.userId() != null;
};

Template.controls.showModifyDialog = function () {
  return Session.get("showModifyDialog");
};

Template.controls.showDeleteDialog = function () {
  return Session.get("showDeleteDialog");
};

Template.controls.events({
  'click a.createNewTest': function () {
    if(Meteor.userId()){
      openCreateDialog();
    };
  }
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

Template.list.loading = function () {
  return !testCasesHandle.ready();
};
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
  Session.set('selected', id);
  window.history.pushState('','',id);
};

Template.list.events({
  'click a': function(event, template){
    var id = event.currentTarget.attributes.getNamedItem('data-id').value;
    setSelected(id);
    event.preventDefault();
  }
});

Template.details.test = function(){
  var result = TestCases.findOne(Session.get("selected"));
  if(result && result.history){
    result.history = result.history.reverse();
    
    var organizeBySelector = function(failures){
      var o = {};
      _.each(failures, function(a, width){
        if(a.forEach === undefined){
          // back-compat for mono-width test results
          return;
        };
        a.forEach(function(failure){
          if(!o.hasOwnProperty(failure['selector'])){
            o[failure['selector']] = {
              selector: failure['selector'],
              instances: []
            };
          };
          o[failure['selector']].instances.push(_.extend({width: width}, failure));
        });
      });
      var sorted = [];
      _.each(o, function(failure){
        sorted.push(failure);
      });
      return sorted;
    };


    result.history.forEach(function(testStatus){
      testStatus.failures = organizeBySelector(testStatus.failures);
    });
  };
  return result;
};

Template.details.fillFrame = function(){
  var test = this;
  setTimeout(function(){
    var linkTags = [];
    test.cssFiles.split('\n').forEach(function(href){
      linkTags.push('<link href="' + href + '?' + Date.now() + 
                    ' type="text/css" rel="stylesheet" />');
    });
    var frameId = 'test-frame-' + test._id,
        frameDoc = document.getElementById(frameId).contentWindow.document,
        frameHTML = ['<html>',
                     '<head>',
                     linkTags.join('\n'),
                     '<style>',
                     '.failure-' + frameId + ' { outline: 2px solid #ff0; }',
                     '</style>',
                     '</head>',
                     '<body>',
                     test.fixtureHTML,
                     '</body>',
                     '</html>'].join('\n');
    frameDoc.open();
    frameDoc.write(frameHTML);
    frameDoc.close();
  }, 10);
};

Template.details.hasNormative = function(){
  return !!this.normative;
};

Template.details.events({
  'click button.run': function(){
    var test = this,
        frameId = 'test-frame-' + test._id,
        frameDoc = document.getElementById(frameId).contentWindow.document,
        normative = JSON.parse(test.normative),
        currentData = CssTest.extractComputedStyles(frameDoc.body,'BODY'),
        failures = CssTest.compareStyles(normative, currentData),
        report = {time: new Date(), 
                  passed: failures.length === 0,
                  failures: failures};
    if(test.history !== undefined && test.history.length !== undefined){
      TestCases.update(test._id, {$push: {history: report}});
    }else{
      TestCases.update(test._id, {$set: {history: [report]}});
    };
    TestCases.update(test._id, {$set: {lastPassed: report.passed}});
  },
  'click button.extract': function(){
    var test = this,
        frameId = 'test-frame-' + test._id,
        frameDoc = document.getElementById(frameId).contentWindow.document,
        data = CssTest.extractComputedStyles(frameDoc.body,'BODY'),
        asString = JSON.stringify(data);
    TestCases.update(test._id, {$set: {normative: asString}});
  },
  'click button.edit': openEditDialog,
  'click button.delete': function(){
    Session.set('showDeleteDialog', true);
  },
  'click a.expand-failures': function(event){
    var $el = $(event.currentTarget),
        failures = $el.parent().children('ul.failures');
    failures.toggleClass('show');
    $el.toggleClass('active');
    event.preventDefault();
  },
  'click a.failure-el': function(event){
    var test = TestCases.findOne(Session.get('selected')),
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

Template.modifyDialog.test = Template.deleteDialog.test = function(){
  var id = Session.get("selected");
  if(id){
    return TestCases.findOne(id);
  }else{
    // No test result when nothing selected
    return {};
  };
};

Template.modifyDialog.events({
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

