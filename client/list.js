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

Template.list.showTest = function(){
  var user = Meteor.user();
  if(!user.profile || !Template.list.dashboard()){
    return true;
  };
  if(!this.hasNormative){
    return user.profile.needsAttentionFilterActive !== false;
  };
  if(this.lastPassed){
    return user.profile.passingFilterActive !== false;
  }else{
    return user.profile.failingFilterActive !== false;
  };
};

Template.list.empty = function(){
  return TestCases.find().count() === 0;
};

Template.list.dashboard = function(){
  return !Session.get('selected');
};

Template.list.hideTests = function(){
  return Template.list.dashboard() && Session.get('showModifyDialog');
};

Template.list.active = function () {
  return Session.equals("selected", this._id) ? " active " : '';
};

Template.list.setSelected = function(id){
  var curVal = Session.get('selected');
  if(id !== curVal){
    Session.set('selected', id);
    Session.set('lastSelected', curVal);
    window.history.pushState('','',id === undefined ? '/' : id);
  };
  Session.set('showModifyDialog', false);
  Session.set('modifyDialogType', 'edit');
  Session.set("modifyDialogStatus", null);
};

Template.list.renderThumbs = function(){
  if(!Template.list.dashboard()){
    return;
  };
  Meteor.setTimeout(function(){
    $('#tests-list a.test').each(function(){
      var $link = $(this);
      var $thumb = $link.find('.thumbnail');
      if($thumb.hasClass('loading') || $thumb.children().length > 0){
        // Already loaded
        return;
      };
      $thumb.addClass('loading');
      var test = new TestCases.TestCase($link.attr('data-id'));
      test.getThumbnail(function(error, result){
        if(error){
          throw error;
          return;
        };
        $('<img>').attr('src', result)
          .appendTo($thumb.removeClass('loading'));
      });
    });
  }, 10);
};

Template.list.events({
  'click a.test': function(event, template){
    Template.list.setSelected(this._id);
    event.preventDefault();
  },
  'click a.create': function (event) {
    Session.set("modifyDialogStatus", null);
    Session.set("modifyDialogType", 'create');
    Session.set("showModifyDialog", true);
    event.preventDefault();
  }
});

// Each filter type works the same
['passing', 'failing', 'needsAttention'].forEach(function(filterType){
  Template.list[filterType + 'ActiveClass'] = function(){
    var user = Meteor.user();
    return user && user.profile && 
           user.profile[filterType + 'FilterActive'] !== false ? 'active' : '';
  };
  var addEvents = {}
  addEvents['click button.' + filterType] = function(event, template){
    var $el = $(event.currentTarget);
    var nowActive = !$el.hasClass('active');
    var setObj = {};
    setObj['profile.' + filterType + 'FilterActive'] = nowActive;
    Meteor.users.update({_id:Meteor.user()._id}, {$set:setObj});
    Template.list.renderThumbs();
    $el.blur();
  };
  Template.list.events(addEvents);
});
