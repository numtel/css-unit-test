var Future = Npm.require('fibers/future');

Meteor.startup(function () {
  // code to run on server at startup
});

Meteor.publish("TestCases", function () {
  if(this.userId==null){
    return [];
  };
  return TestCases.find({owner: this.userId});
});

Meteor.methods({
  extractStyles: function(id){
    var fut = new Future();
    var test = new TestCases.TestCase(id);
    test.extractStylesAsync(function(error, result){
      if(error){
        throw error;
      };
      fut['return'](result);
    });
    return fut.wait();
  },
  setNormative: function(options){
    var test = new TestCases.TestCase(options.id);
    return test.setNormative(options.value);
  },
  loadLatestNormative: function(options){
    var test = new TestCases.TestCase(options.id);
    return test.loadLatestNormative();
  },
  loadAllNormatives: function(options){
    var test = new TestCases.TestCase(options.id);
    return test.loadAllNormatives();
  },
  run: function(options){
    var fut = new Future();
    var test = new TestCases.TestCase(options.id);
    test.run(options.options, function(error, result){
      if(error){
        throw error;
      };
      fut['return'](result);
    });
    return fut.wait();
  },
});
