TestCases = new Meteor.Collection('TestCases');

var testCasesHandle;
Deps.autorun(function () {
  testCasesHandle = Meteor.subscribe('TestCases');
});

UI.registerHelper('resetURL', function(){
  window.history.pushState('','','/');
  Session.set('selected', undefined);
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
