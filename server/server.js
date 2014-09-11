Meteor.startup(function(){
  if(Meteor.settings.remoteSMTP){
    process.env.MAIL_URL = 'smtp://' + Meteor.settings.remoteSMTP.username + 
      ':' + Meteor.settings.remoteSMTP.password + '@' + 
      Meteor.settings.remoteSMTP.server + '/';
    console.log('SMTP set: ' + Meteor.settings.remoteSMTP.server);
  };
});
