Template.welcome.rendered = function(){
  Session.set('watchVideo', null);
};

Template.welcome.events({
  'click .watch-video': function(event){
    event.preventDefault();
    Session.set('watchVideo', true);
  }
});

Template.welcome.showVideo = function(){
  return Session.get('watchVideo');
};
