var Future = Npm.require('fibers/future');
TestCases = new Meteor.Collection('TestCases'); // Parent Collection
TestNormatives = new Meteor.Collection('TestNormatives');
TestHistory = new Meteor.Collection('TestHistory');

var fieldDefs = {
  title: ['Title', 'string', {min: 1, max: 100}],
  description: ['Description', 'string', {min: 0, max: 1000}],
  interval: ['Schedule Interval', 'integer', {optional: true, min:1}],
  remoteStyles: ['Remote Styles', 'string', {min:0, max:1000}],
  cssFiles: ['CSS Files', 'string', {min:0, max: 10000}],
  testURL: ['Test URL', 'string', {min:0, max:1000}],
  fixtureHTML: ['Fixture HTML', 'string', {min: 0, max: 100000}],
  widths: ['Test Resolution Widths', 'integerList', {}]
};

TestCases.allow({
  insert: function (userId, test) {
    return false; // no cowboy inserts -- use createTest method
  },
  update: function (userId, test, fields, modifier) {
    if (userId !== test.owner)
      return false; // not the owner

    // Only allow updating sort order, otherwise use editTest method
    var allowed = ['rank'];
    return _.difference(fields, allowed).length === 0;
  },
  remove: function (userId, test) {
    return test.owner === userId;
  }
});

Meteor.publish("TestCases", function () {
  if(this.userId==null){
    return [];
  };
  return TestCases.find({owner: this.userId});
});

Meteor.publish("TestHistory", function () {
  if(this.userId==null){
    return [];
  };
  return TestHistory.find({owner: this.userId});
});

var loadTest = function(id){
  if(TestCases.TestCase){
    var test = new TestCases.TestCase(id);
    if(test.notFound){
      throw 'Invalid test case';
    };
    return test;
  }else{
    throw 'TestCases.TestCase not loaded!';
  };
};

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
  var test = loadTest(id);
  if(!test.nextRun || test.nextRun > Date.now()){
    // Skip if the situation has changed while this was queued.
    return;
  };
  test.run(function(error, result){
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
  });
};

Meteor.startup(function(){
  // Run Scheduled Tests
  Meteor.setInterval(function(){
    TestCases.find({nextRun: {$lt: Date.now()}}, {fields: {_id: 1}})
      .forEach(function(testDoc){
        runScheduled(testDoc._id);
      });
  }, 1000 * 31);
});

Meteor.methods({
  createTest: function (options) {
    validatePost(options, true);

    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");

    var id = options._id || Random.id();
    var doc = {
      _id: id,
      rank: 0,
      owner: this.userId
    };
    _.each(fieldDefs, function(def, key){
      doc[key] = options[key];
    });
    TestCases.insert(doc, function(error, result){
      if(error){
        throw error;
      };
    });
    return id;
  },
  editTest: function (options) {
    validatePost(options, false);

    var current = new TestCases.TestCase(options._id);

    if (current.notFound)
      throw new Meteor.Error(403, "Invalid test case");

    var doc = {};
    _.each(fieldDefs, function(def, key){
      doc[key] = options[key];
    });
    current.setData(doc, function(error, result){
      if(error){
        throw error;
      };
    });

    return options._id;
  },
  getHistory: function(options){
    return loadTest(options.id).history;
  },
  setData: function(options){
    var fut = new Future();
    loadTest(options.id).setData(options.data, function(error, result){
      if(error){
        throw error;
      };
      fut['return'](result);
    });
    return fut.wait();
  },
  extractStyles: function(options){
    var fut = new Future();
    loadTest(options.id).extractStyles(function(error, result){
      if(error){
        fut['return']('##ERROR##' + error);
        return;
      };
      fut['return'](result);
    });
    return fut.wait();
  },
  stylesheetsFromUrl: function(options){
    var fut = new Future();
    loadTest(options.id).stylesheetsFromUrl(options.url, function(error, result){
      if(error){
        fut['return']('##ERROR##' + error);
      }else{
        fut['return'](result);
      };
    });
    return fut.wait();
  },
  setNormative: function(options){
    return loadTest(options.id).setNormative(options.value);
  },
  loadLatestNormative: function(options){
    return loadTest(options.id).loadLatestNormative();
  },
  loadAllNormatives: function(options){
    return loadTest(options.id).loadAllNormatives();
  },
  loadNormative: function(options){
    return loadTest(options.id).loadNormative(options.options);
  },
  run: function(options){
    var fut = new Future();
    loadTest(options.id).run(options.options, function(error, result){
      if(error){
        fut['return']('##ERROR##' + error);
        return;
      };
      fut['return'](result);
    });
    return fut.wait();
  },
});

var validatePost = function(data, isCreate){
  var validators = {
    string: function(key, value, label, options){
      if(options.min !== undefined && value.length < options.min){
        return label + ' is too short.';
      };
      if(options.max !== undefined && value.length > options.max){
        return label + ' is too long.';
      };
      return true;
    },
    integer: function(key, value, label, options){
      if(value === '' && options.optional){
        return true;
      };
      if(!/^[0-9-]+$/.test(value)){
        return label + ' must be an integer.';
      };
      if(options.min !== undefined && value < options.min){
        return label + ' must be at least ' + options.min + '.';
      };
      if(options.max !== undefined && value > options.max){
        return label + ' must be no more than ' + options.max + '.';
      };
      return true;
    },
    integerList: function(key, value, label, options){
      if(!/^[0-9,\s]+$/.test(value)){
        return label + ' may only include numbers, commas, and spaces.';
      };
      return true;
    }
  };
  var validate = function(key, value){
    if(fieldDefs.hasOwnProperty(key)){
      return validators[fieldDefs[key][1]](key, value, fieldDefs[key][0], fieldDefs[key][2])
    };
    return 'Post error!';
  };
  if(!isCreate){
    fieldDefs['_id'] = ['ID', 'string', {min:1, max:100}];
    // Modifying a test, ensure that each passed value matches
    _.each(data, function(value, key){
      var result = validate(key, value);
      if(result !== true){
        throw new Meteor.Error(413, result);
      };
    });
    delete fieldDefs['_id'];
  }else{
    // Creating a test, make sure every field validates
    _.each(fieldDefs, function(options, key){
      var result = validate(key, data[key]);
      if(result !== true){
        throw new Meteor.Error(413, result);
      };
    });
  };
};

