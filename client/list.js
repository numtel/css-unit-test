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

Template.list.setSelected = function(id){
  if(id !== Session.get('selected')){
    Session.set('selected', id);
    window.history.pushState('','',id === undefined ? '/' : id);
  };
  Session.set('showModifyDialog', false);
  Session.set('modifyDialogType', 'edit');
  Session.set("modifyDialogStatus", null);
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
