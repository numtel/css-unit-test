UI.registerHelper('resetURL', function(){
  Template.list.setSelected();
});

UI.registerHelper('dashboard', function(){
  return Template.list.dashboard();
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

UI.registerHelper('loading', function () {
  return !CssTestsHandle.ready();
});

Template.controls.events({
  'click a.brand': function(event){
    Template.list.setSelected();
    event.preventDefault();
  }
});

var setAccentColor = function(color, animate){
  ColorSwap({
    find: ['#428bca', 
           '#2a6496', 
           '#67abe6', 
           '#66afe9', 
           '#3071a9', 
           '#285e8e', 
           'rgb(53, 126, 189)'],
    replace: color,
    animation: animate ? 'rgb' : 'none',
    duration: 40
  });
};

Template.controls.rendered = function(){
  var colorPickerButton = $('<button class="btn btn-default btn-block">' +
                            'Change Interface Accent Color</button>');
  var dontSet = false;
  colorPickerButton.colorpicker({
    color: '#428bca'
  }).on('changeColor', function(ev){
    var hexColor = ev.color.toHex();
    if(!dontSet){
      setAccentColor(hexColor);
    };
    Meteor.users.update({_id:Meteor.user()._id}, 
                        {$set:{"profile.color":hexColor}});
  });                            

  var waitForLogin = setInterval(function(){
    var menu = $('#login-dropdown-list .dropdown-menu');
    if(menu.length){
      var userData = Meteor.user();
      if(userData.profile && userData.profile.color){
        setAccentColor(userData.profile.color, true);
        dontSet = true;
        colorPickerButton.colorpicker('setValue', userData.profile.color);
        dontSet = false;
      };
      menu.prepend(colorPickerButton);
      clearInterval(waitForLogin);
    };
  }, 100);

};
