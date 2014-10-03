var determineUserEmail = function(user){
  var email;
  if(user.emails && user.emails.length > 0){
    email = user.emails[0].address;
  }else if(user.services){
    _.each(user.services, function(serviceData, service){
      if(serviceData.email){
        email = serviceData.email;
      };
    });
  };
  return email;
};

var runScheduled = function(id){
  var test = new CssTest(id);
  if(!test) return;
  if(!test.nextRun || test.nextRun > Date.now()){
    // Skip if the situation has changed while this was queued.
    return;
  };
  var error, result;
  try{
    result = test.run();
  }catch(err){
    error = err;
  };

  var recip = Meteor.users.findOne(test.owner),
      recipEmail = determineUserEmail(recip);
  if(recipEmail){
    var email = {
      to: recipEmail,
      from: 'no-reply@steeztest.me',
    };
    if(error){
      email.subject = 'Test Error - ' + test.title + ' - SteezTest.me';
      email.html = ['<p>An error has occurred while trying to run your test, ',
                    test.title,
                    ':</p><p>',
                    error,
                    '</p><p><a href="',
                    Meteor.absoluteUrl(test._id),
                    '">View Test Details</a></p>'].join('');
      email.text = ['An error has occurred while trying to run your test, ',
                    test.title,
                    ':\n\n',
                    error,
                    '\n\nView test details at: ',
                    Meteor.absoluteUrl(test._id)].join('');
    }else if(!result.passed){
      email.subject = 'Test Failure - ' + test.title + ' - SteezTest.me';
      email.html = ['<p>Your test, ',
                    test.title,
                    ', has failed.</p><p><a href="',
                    Meteor.absoluteUrl(test._id),
                    '">View Test Details</a></p>'].join('');
      email.text = ['Your test, ',
                    test.title,
                    ', has failed.\n\n View test details at: ',
                    Meteor.absoluteUrl(test._id)].join('');
    };
    if(email.text){
      Email.send(email);
    };
  };
};

Meteor.startup(function(){
  // Run Scheduled Tests
  Meteor.setInterval(function(){
    CssTests.find({nextRun: {$lt: Date.now()}}, {fields: {_id: 1}})
      .forEach(function(testDoc){
        runScheduled(testDoc._id);
      });
  }, 1000 * 31);
});
