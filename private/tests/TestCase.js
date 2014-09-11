var _ = require('./lib/underscore-min');
var _id = 'test1';

exports.not_found = function(TestCases, log, wait){
  var test = new TestCases.TestCase('invalid_id');
  if(test.notFound !== true){
    throw 'Did not return notFound';
  };
};

exports.data_is_loaded = function(TestCases, log, wait){
  var test = new TestCases.TestCase(_id);
  var mockup = TestCases.findOne(_id);
  _.each(mockup, function(val, key){
    if(test[key] !== val){
      throw 'Unexpected value for "' + key + '": ' + val;
    };
  });
};

exports.widths_to_array = function(TestCases, log, wait){
  var test = new TestCases.TestCase(_id);
  if(test.widthsArray.length !== 2 ||
     test.widthsArray[0] !== 1024 ||
     test.widthsArray[1] !== 720){
      throw 'Failed!';
  };
};

exports.test_setData = function(TestCases, log, wait){
  var datas = [
    {title: 'Cowabunga'},
    {cssFiles: 'http://test2.com/test.css\nhttp://test3.com/sample1.css'}
  ];
  var returns = [], doReturn = function(val){
    if(val === undefined){
      val = '';
    };
    returns.push(val);
    if(returns.length === datas.length){
      if(returns.join('').length){
        throw returns.join('\n');
      };
      wait.done();
    };
  };
  datas.forEach(function(newData){
    var test = new TestCases.TestCase(_id);
    var mockup = TestCases.findOne(_id);
    test.setData(newData, function(error, result){
      if(error){
        throw error;
      };
      // Check that data updates
      var failed = false;
      _.each(newData, function(val, key){
        if(!failed && test[key] !== val){
          failed = true;
          doReturn('Data mismatch on "' + key + '": ' + test[key]);
          return;
        };
      });

      // Check that hasNormative updates with select fields
      var updateNormative = [
         'cssFiles', 
         'widths', 
         'testURL',
         'fixtureHTML', 
         'remoteStyles'];
      failed = false;
      updateNormative.forEach(function(updateField){
        if(newData[updateField] !== undefined &&
            newData[updateField] !== mockup[updateField] &&
            test.hasNormative !== false){
          failed = true;
          doReturn('hasNormative not reset! Passed ' + _.keys(newData).join(', '));
          return;
        };
      });
      // Check nextRun interval
      doReturn('TODO: Not yet completed!');
      // Check that update is called with correct data
      doReturn();
    });
  });
  return wait;
};
