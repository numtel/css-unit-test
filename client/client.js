Meteor.subscribe('TestCases');

Template.controls.events({
  'click a.createNewTest': function () {
    if(Meteor.userId()){
      openCreateDialog();
    };
  }
});

var openCreateDialog = function () {
  Session.set("createError", null);
  Session.set("showCreateDialog", true);
};

Template.controls.loggedIn = function () {
  return Meteor.userId() != null;
};

Template.controls.showCreateDialog = function () {
  return Session.get("showCreateDialog");
};

Template.list.tests = function(){
  return TestCases.find({}, {sort: {name: 1}});
};

Template.list.empty = function(){
  return TestCases.find().count() === 0;
};

Template.list.active = function () {
  return Session.equals("selected", this._id) ? " active " : '';
};

Template.list.events({
  'click a': function(event, template){
    var id = event.currentTarget.attributes.getNamedItem('data-id').value;
    Session.set('selected', id);
  }
});

Template.details.test = function(){
  return TestCases.findOne(Session.get("selected"));
};

Template.details.fillFrame = function(){
  var test = this;
  setTimeout(function(){
    var linkTags = [];
    test.cssFiles.split('\n').forEach(function(href){
      linkTags.push('<link href="' + href + '" type="text/css" rel="stylesheet" />');
    });
    var frameId = 'test-frame-' + test._id,
        frameDoc = document.getElementById(frameId).contentWindow.document,
        frameHTML = ['<html>',
                     '<head>',
                     linkTags.join('\n'),
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

var extractComputedStyles = function(base, baseSelector){
  if(baseSelector === undefined){
    baseSelector = '';
  };
  var output = [];
  _.each(base.children, function(child){
    var selector = baseSelector + '>' + child.nodeName + 
                   (child.id ? '#' + child.id : '');
    output.push({
      selector: selector,
      styles: window.getComputedStyle(child),
      children: extractComputedStyles(child, selector)
    });
  });
  return output;
};

Template.details.events({
  'click button.extract': function(){
    var test = this,
        frameId = 'test-frame-' + test._id,
        frameDoc = document.getElementById(frameId).contentWindow.document;
    console.log(extractComputedStyles(frameDoc.body,'BODY'));

    
  }
});

Template.createDialog.events({
  'click .save': function (event, template) {
    var title = template.find(".title").value;
    var description = template.find(".description").value;
    var cssFiles = template.find(".css-files").value;
    var fixtureHTML = template.find(".fixture-html").value;

    if (title.length && cssFiles.length && fixtureHTML.length) {
      var id = Meteor.call('createTest', {
        title: title,
        description: description,
        cssFiles: cssFiles,
        fixtureHTML: fixtureHTML
      });

      Session.set("selected", id);
      Session.set("showCreateDialog", false);
    } else {
      Session.set("createError",
                  "Needs a title, css file and fixture HTML!");
    }
  },

  'click .cancel': function () {
    Session.set("showCreateDialog", false);
  }
});

Template.createDialog.error = function () {
  return Session.get("createError");
};

