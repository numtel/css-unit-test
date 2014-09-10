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
     help: 'Optional: Specify a URL to copy stylesheets from. (e.g. http://example.com/)'},
    {key: 'cssFiles',
     label: 'CSS Files',
     textarea: true,
     help: 'Place one HREF per line to include individual stylesheets. ' +
           '(e.g. http://example.com/css/main.css)'},
    {key: 'testURL',
     label: 'Test URL',
     text: true,
     help: '<a href="#" class="btn btn-default pull-right make-guess">' +
            'Guess from Remote Styles/CSS Files</a>' + 
           'Should match the protocol and server name of loaded stylesheets.<br>' + 
           'Required to view which rules applied to elements.'},
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
  'click .make-guess': function(event, template){
    event.preventDefault();
    var remoteStyles = template.find('.remoteStyles').value,
        cssFiles = template.find('.cssFiles').value,
        guesses = [],
        urlMatch = /https?\:\/\/.+\//;
    if(remoteStyles && urlMatch.test(remoteStyles)){
      guesses.push(urlMatch.exec(remoteStyles)[0]);
    };
    if(cssFiles.trim() !== ''){
      cssFiles.split('\n').forEach(function(cssUrl){
        if(cssUrl.trim() !== '' && urlMatch.test(cssUrl)){
          guesses.push(urlMatch.exec(cssUrl)[0]);
        };
      });
    };
    // Return most guessed
    var finalGuess = _.chain(guesses).countBy().pairs().max(_.last).head().value();
    template.find('.testURL').value = finalGuess;
  },
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
          Session.set('modifyDialogStatus', error.reason);
          $.scrollTo($form.find('.alert'), 400, {axis:'y', offset: -20});
        }else{
          Template.list.setSelected(result);
          Session.set("showModifyDialog", false);
          Session.set("modifyDialogType", 'edit');
          Session.set('modifyDialogStatus', undefined);
        };
      });
    }else{
      postData._id = this._id;
      Meteor.call('editTest', postData, function(error, result){
        $save.parent().removeClass('loading');
        $save.removeClass('disabled');
        if(error){
          Session.set('modifyDialogStatus', error.reason);
          $.scrollTo($form.find('.alert'), 400, {axis:'y', offset: -20});
        }else{
          Session.set("showModifyDialog", false);
          Session.set('modifyDialogStatus', 'Changes saved successfully.');
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

Template.modifyDialog.status = function () {
  return Session.get("modifyDialogStatus");
};

Template.modifyDialog.statusSuccess = function(){
  var status = Template.modifyDialog.status();
  return typeof status === 'string' && status.indexOf('success') !== -1;
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

