var Future = Npm.require('fibers/future');

Meteor.startup(function () {
  // code to run on server at startup
});

Meteor.publish("TestCases", function () {
  if(this.userId==null){
    return [];
  };
  return TestCases.find(
    {owner: this.userId}, 
    {fields: {history: 0}}
  );
});

var loadTest = function(id){
  var test = new TestCases.TestCase(id);
  if(test.notFound){
    throw 'Invalid test case';
  };
  return test;
};

Meteor.methods({
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
        throw error;
      };
      fut['return'](result);
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
        throw error;
      };
      fut['return'](result);
    });
    return fut.wait();
  },
});
