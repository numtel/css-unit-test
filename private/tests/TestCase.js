var _ = require('./lib/underscore-min');
var mockups = require('./mockups');
var _id = 'test1';

// exports.test_xxx = function(log, wait, TestCases){
//   var datas = [
//      ...
//   ];
//   return multipleDatas(datas, wait, function(data){
//     return wait.finished();
//   });
// };
var multipleDatas = function(datas, wait, func){
  var returns = 0, doReturn = function(){
    returns++;
    if(returns === datas.length){
      wait.done();
    };
  };

  wait.finished = doReturn;

  datas.forEach(function(newData){
    func.call(this, newData);
  });

  return wait;
};

exports.not_found = function(log, wait, TestCases){
  var test = new TestCases.TestCase('invalid_id');
  if(test.notFound !== true){
    throw 'Did not return notFound';
  };
};

exports.data_is_loaded = function(log, wait, TestCases){
  var test = new TestCases.TestCase(_id);
  var mockup = TestCases.findOne(_id);
  _.each(mockup, function(val, key){
    if(test[key] !== val){
      throw 'Unexpected value for "' + key + '": ' + val;
    };
  });
};

exports.widths_to_array = function(log, wait, TestCases){
  var test = new TestCases.TestCase(_id);
  if(test.widthsArray.length !== 2 ||
     test.widthsArray[0] !== 1024 ||
     test.widthsArray[1] !== 720){
      throw 'Failed!';
  };
};

exports.test_setData = function(log, wait, TestCases){
  // setData does not validate inputs. That happens before this function,
  // if necessary.

  var datas = [
    {title: 'Cowabunga', description: 'Babaganoush'},
    {cssFiles: 'http://test2.com/test.css\nhttp://test3.com/sample1.css'},
    {interval: '', widths: '234,1290'},
    {interval: '4'}
  ];

  return multipleDatas(datas, wait, function(newData){
    var test = new TestCases.TestCase(_id);
    var mockup = TestCases.findOne(_id);
    var updateCount = TestCases.updateFields.length;

    // Special Case: Must set nextRun in order to test that it is cleared
    if(newData.interval === ''){
      test.nextRun = 21093129;
    };

    test.setData(newData, function(error, result){
      if(error){
        throw error;
      };
      // Check that data updates
      _.each(newData, function(val, key){
        if(test[key] !== val){
          throw 'Data mismatch on "' + key + '": ' + test[key];
        };
      });

      // Check that widthsArray updates
      if(newData.widths !== undefined){
        var expectedWidthsArray = newData.widths.split(',').map(function(width){
          return parseInt(width.trim(), 10);
        });
        if(_.difference(test.widthsArray, expectedWidthsArray).length > 0){
          throw 'widthsArray did not update properly!';
        };
      };

      // Check that hasNormative updates with select fields
      var updateNormative = [
         'cssFiles', 
         'widths', 
         'testURL',
         'fixtureHTML', 
         'remoteStyles'];
      updateNormative.forEach(function(updateField){
        if(newData[updateField] !== undefined &&
            newData[updateField] !== mockup[updateField] &&
            test.hasNormative !== false){
          throw 'hasNormative not reset! Passed ' + _.keys(newData).join(', ');
        };
      });

      // Check nextRun interval
      if(newData.interval !== undefined){
        if(newData.interval === '' && test.nextRun !== undefined){
          throw 'Didn\'t reset nextRun';
        }else if(newData.interval.length && test.nextRun === undefined){
          throw 'Didn\'t set nextRun';
        };
      };

      // Check that update is called with correct data
      if(TestCases.updateFields.length === updateCount){
        throw 'Didn\'t call update';
      };
      var lastUpdate = TestCases.updateFields[TestCases.updateFields.length-1];
      if(lastUpdate.$set === undefined){
        throw 'Invalid update!';
      };
      _.each(newData, function(val, key){
        if(lastUpdate.$set[key] !== val){
          throw 'Update doesn\'t match on "' + key + '": ' + val;
        };
      });

      // All clear
      wait.finished();
    });
  });
};


exports.test_styleSheetsFromUrl = function(log, wait, TestCases){
  var test = new TestCases.TestCase(_id);
  test.stylesheetsFromUrl('http://google.com/', function(error, result){
    if(error){
      throw 'Loadable url should not result in error';
    };
    if(result.indexOf('link-tag-success') === -1){
      throw 'Didn\'t work for loadable url';
    };
  });
  test.stylesheetsFromUrl('asfdasdfm/', function(error, result){
    if(result){
      throw 'Error should not have result';
    };
    if(!error){
      throw 'Error should have produced error';
    };
  });
};

exports.test_getHTML = function(log, wait, TestCases){
  var datas = [
    // Test with default mockup
    {options: {},
     expected: [
      // Needs to have checked for remote styles succesfully, from mockup:
      'link-tag-success',
      '<html test-ignore>',
      '<body test-ignore>',
     ],
     successful: true},
    // Test alternate fixtureHTML
    {options: {fixtureHTML: '<body>something you would not expect</body>'},
     unexpected: [
      '<body test-ignore>'
     ],
     successful: true},
    {options: {fixtureHTML: '<html><body>something you would not expect</body></html>'},
     expected: [
      'link-tag-success',
      'something you would not expect</body>'
     ],
     unexpected: [
      '<html test-ignore>',
      '<body test-ignore>'
     ],
     successful: true},
    // Test with normative
    {options: {
      normativeValue: [
          {selector: 'h1',
           attributes: {'color': '#ff0'},
           children: [
            {selector: 'h1>em',
             attributes: {'text-align': 'center'}}
           ]}
        ]
      },
     expected: [
      'h1{color: #ff0; }',
      'h1>em{text-align: center; }'
     ],
     successful: true},
    // Test with normative + diff
    {options: {
      normativeValue: [
          {selector: 'h1',
           attributes: {'color': '#ff0'},
           children: [
            {selector: 'h1>em',
             attributes: {'text-align': 'center'}}
           ]}
        ],
       diff: [
        // No children in diff, just flat
        {selector: 'h1',
         instances: [{key: 'color', bVal: '#000'}]}
       ]
      },
     expected: [
      'h1{color: #000; }',
      'h1>em{text-align: center; }'
     ],
     successful: true}
  ];
  return multipleDatas(datas, wait, function(data){
    var test = new TestCases.TestCase(_id);
    test.getHTML(data.options, function(error, result){
      if(data.successful && error){
        throw error;
      }else if(!data.successful && !error){
        throw 'Should have produced error';
      };
      // Result should include fixtureHTML exactly as long as it doesn't
      // have an html tag in it
      var fixtureHTML = data.options.fixtureHTML || test.fixtureHTML;
      if(fixtureHTML.indexOf('<html') === -1 && result.indexOf(fixtureHTML) === -1){
        throw 'fixtureHTML not included';
      };
      // Result should have basic tags
      ['html', 'head', 'body'].forEach(function(tag){
        var matcher = new RegExp('\<' + tag + '[^]+\<\/' + tag + '\>', 'i');
        if(!matcher.test(result)){
          throw 'Missing tag: ' + tag;
        };
      });

      if(data.options.normativeValue === undefined){
        // CSS Files should be included
        test.cssFiles.split('\n').forEach(function(href){
          if(href.trim() !== '' && result.indexOf(href) === -1){
            throw 'CSS File not included: ' + href;
          };
        });
      }else{
        // No links only style tags
        if(/\<link .+rel=\"stylesheet\".+\>/i.test(result) ||
            !/\<style\>[^]+\<\/style\>/i.test(result)){
          throw 'Should have style tag and no link tag when passed normative'
        };

      };

      if(data.expected && data.expected.length){
        data.expected.forEach(function(expected){
          if(result.indexOf(expected) === -1){
            throw 'Missing: ' + expected;
          };
        });
      };
      if(data.unexpected && data.unexpected.length){
        data.unexpected.forEach(function(unexpected){
          if(result.indexOf(unexpected) !== -1){
          log(result);
            throw 'Should not have: ' + unexpected;
          };
        });
      };

      wait.finished();
    });
  });
};



exports.test_extractStyles = function(log, wait, TestCases){
  var test = new TestCases.TestCase(_id);
  test.extractStyles(function(error, result){
    if(error){
      throw error;
    };
    // Should be the results of phantomjs as a json object for each width
    var expected = mockups.npm.require('fs').readFileSync('sometest.out');

    test.widthsArray.forEach(function(width){
      if(result[width] === undefined){
        throw 'Width not found: ' + width;
      };
      if(JSON.stringify(result[width]) !== expected){
        throw 'Does not match mockup';
      };
    });

    wait.done();
  });
  return wait;
};

exports.test_setNormative = function(log, wait, TestCases, TestNormatives){
  var test = new TestCases.TestCase(_id);
  var updateCount = TestCases.updateIds.length;
  var insertCount = TestNormatives.insertData.length;
  test.setNormative(function(error, result){
    // Should not error
    if(error){
      throw error;
    };

    // Check result
    if(result._id.substr(0,7) !== 'random-'){
      throw 'Missing normative id';
    };
    if(result.testCase !== _id){
      throw 'Missing test id';
    };
    if(result.owner !== test.owner){
      throw 'Missing test owner';
    };
    if(Math.abs(result.timestamp-Date.now()) > 1000){
      throw 'Missing timestamp';
    };

    // Should be the results of phantomjs as a json object for each width
    var expected = mockups.npm.require('fs').readFileSync('sometest.out');

    test.widthsArray.forEach(function(width){
      if(result.value[width] === undefined){
        throw 'Width not found: ' + width;
      };
      if(JSON.stringify(result.value[width]) !== expected){
        throw 'Does not match mockup';
      };
    });

    if(TestCases.updateIds.length === updateCount){
      throw 'Did not call TestCases.update';
    };
    var lastId = TestCases.updateIds[TestCases.updateIds.length - 1];
    var lastFields = TestCases.updateFields[TestCases.updateIds.length -1];
    if(lastId !== _id){
      throw 'Did not call TestCases.update with correct _id';
    };
    if(lastFields.$set === undefined || !lastFields.$set.hasNormative){
      throw 'Did not call TestCases.update with hasNormative: true';
    };

    if(TestNormatives.insertData.length === insertCount){
      throw 'Did not call TestNormatives.insert';
    };
    var lastData = TestNormatives.insertData[TestNormatives.insertData.length -1];
    if(lastData !== result){
      throw 'Did not call TestNormatives.insert with correct data';
    };

    wait.done();
  });
  return wait;
};
