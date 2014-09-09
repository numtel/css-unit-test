TestCases = new Meteor.Collection('TestCases');
TestHistory = new Meteor.Collection('TestHistory');

Meteor.subscribe('TestHistory');

var testCasesHandle;
Deps.autorun(function () {
  testCasesHandle = Meteor.subscribe('TestCases');
});

UI.registerHelper('resetURL', function(){
  Template.list.setSelected();
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

Template.controls.events({
  'click a.brand': function(event){
    Template.list.setSelected();
    event.preventDefault();
  }
});
