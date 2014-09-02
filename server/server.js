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
    test.extractStylesAsync(function(result){
      fut['return'](result);
    });
    return fut.wait();
  },
  setNormative: function(options){
    var test = new TestCases.TestCase(options.id);
    test.setNormative(options.value);
  },
  loadLatestNormative: function(options){
    var test = new TestCases.TestCase(options.id);
    var out = test.loadLatestNormative();
    console.log(out);
    return out;
  },
  loadAllNormatives: function(options){
    var test = new TestCases.TestCase(options.id);
    return test.loadAllNormatives();
  }
});
