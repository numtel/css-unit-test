Template.modifyDialog.fields = function(){
  return [
    {key: 'title',
     label: 'Title',
     text: true},
    {key: 'description',
     label: 'Description',
     textarea: true},
    {key: 'interval',
     label: 'Schedule Interval',
     text:true,
     help: 'Optional: Specify the number of minutes between each automated test run. You will receive an email on test failure or error.'},
    {key: 'remoteStyles',
     label: 'Remote Styles',
     text: true,
     help: 'Optional: Specify a URL to copy stylesheets from.'},
    {key: 'cssFiles',
     label: 'CSS Files',
     textarea: true,
     help: 'Place one HREF per line to include individual stylesheets.'},
    {key: 'widths',
     label: 'Test Resolution Width',
     text: true,
     default: '1024',
     help: 'Please specify a comma separated list of pixel window widths to test.'},
    {key: 'fixtureHTML',
     label: 'Fixture HTML',
     textarea: true,
     help: 'Only include <code>&lt;body&gt;</code> or <code>&lt;html&gt;</code> ' +
           'tags if needed in order to track their styles or set their attributes.' +
           '<br>Place an attribute of <code>test-ignore</code> to skip tracking ' +
           'on any element.'}
  ];
};

Template.modifyDialog.isCreate = function(){
  return Session.get("modifyDialogType") ===  'create';
};

Template.modifyDialog.testId = function(){
  if(Template.modifyDialog.isCreate()){
    return 'new';
  };
  return Session.get('selected');
};

Template.modifyDialog.fieldValue = function(){
  var test = {};
  if(!Template.modifyDialog.isCreate()){
    test = Template.modifyDialog.test();
  };
  return test[this.key] ? test[this.key] :
            this.default ? this.default : '';
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
    Template.modifyDialog.fields().forEach(function(field){
      template.find('.' + field.key).value = test[field.key];
    });
  },
  'submit form': function (event, template) {
    event.preventDefault();
    var $form = $(event.currentTarget),
        $save = $form.find('button.save');
    $save.parent().addClass('loading');
    $save.addClass('disabled');

    var postData = {};
    Template.modifyDialog.fields().forEach(function(field){
      postData[field.key] = template.find('.' + field.key).value;
    });


    if(Template.modifyDialog.isCreate()){
      Meteor.call('createTest', postData, function(error, result){
        $save.parent().removeClass('loading');
        $save.removeClass('disabled');
        if(error){
          Session.set('modifyDialogError', error.reason);
          $.scrollTo($form.find('.alert'), 400, {axis:'y', offset: -20});
        }else{
          Template.list.setSelected(result);
          Session.set("showModifyDialog", false);
          Session.set("modifyDialogType", 'edit');
          Session.set('modifyDialogError', undefined);
        };
      });
    }else{
      postData._id = this._id;
      Meteor.call('editTest', postData, function(error, result){
        $save.parent().removeClass('loading');
        $save.removeClass('disabled');
        if(error){
          Session.set('modifyDialogError', error.reason);
          $.scrollTo($form.find('.alert'), 400, {axis:'y', offset: -20});
        }else{
          Session.set("showModifyDialog", false);
          Session.set('modifyDialogError', undefined);
          $.scrollTo($form.closest('.test-details').find('h2').eq(0), 
                      400, {axis:'y', offset: -20});
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

