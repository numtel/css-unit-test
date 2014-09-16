var _ = require('./node_modules/underscore-min');
var _id = 'test1';

// exports.test_xxx = function(log, wait, mockups){
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

exports.not_found = function(log, wait, mockups){
  var test = new mockups.TestCases.TestCase('invalid_id');
  if(test.notFound !== true){
    throw new Error('Did not return notFound');
  };
};

exports.data_is_loaded = function(log, wait, mockups){
  var test = new mockups.TestCases.TestCase(_id);
  var mockup = mockups.TestCases.findOne(_id);
  _.each(mockup, function(val, key){
    if(test[key] !== val){
      throw new Error('Unexpected value for "' + key + '": ' + val);
    };
  });
};

exports.widths_to_array = function(log, wait, mockups){
  var test = new mockups.TestCases.TestCase(_id);
  if(test.widthsArray.length !== 2 ||
     test.widthsArray[0] !== 1024 ||
     test.widthsArray[1] !== 720){
      throw new Error('Failed!');
  };
};

exports.test_setData = function(log, wait, mockups){
  // setData does not validate inputs. That happens before this function,
  // if necessary.

  var datas = [
    {title: 'Cowabunga', description: 'Babaganoush'},
    {cssFiles: 'http://test2.com/test.css\nhttp://test3.com/sample1.css'},
    {interval: '', widths: '234,1290'},
    {interval: '4'}
  ];

  return multipleDatas(datas, wait, function(newData){
    var test = new mockups.TestCases.TestCase(_id);
    var mockup = mockups.TestCases.findOne(_id);
    var updateCount = mockups.TestCases.updateFields.length;

    // Special Case: Must set nextRun in order to test that it is cleared
    if(newData.interval === ''){
      test.nextRun = 21093129;
    };

    test.setData(newData, function(error, result){
      if(error){
        if(typeof error === 'string'){
          error = new Error(error);
        };
        throw error;
      };
      // Check that data updates
      _.each(newData, function(val, key){
        if(test[key] !== val){
          throw new Error('Data mismatch on "' + key + '": ' + test[key]);
        };
      });

      // Check that widthsArray updates
      if(newData.widths !== undefined){
        var expectedWidthsArray = newData.widths.split(',').map(function(width){
          return parseInt(width.trim(), 10);
        });
        if(_.difference(test.widthsArray, expectedWidthsArray).length > 0){
          throw new Error('widthsArray did not update properly!');
        };
      };

      // Check that hasNormative updates with select fields
      var updateNormative = ['widths'];
      updateNormative.forEach(function(updateField){
        if(newData[updateField] !== undefined &&
            newData[updateField] !== mockup[updateField] &&
            test.hasNormative !== false){
          throw new Error('hasNormative not reset! Passed ' + _.keys(newData).join(', '));
        };
      });

      // Check nextRun interval
      if(newData.interval !== undefined){
        if(newData.interval === '' && test.nextRun !== undefined){
          throw new Error('Didn\'t reset nextRun');
        }else if(newData.interval.length && test.nextRun === undefined){
          throw new Error('Didn\'t set nextRun');
        };
      };

      // Check that update is called with correct data
      if(mockups.TestCases.updateFields.length === updateCount){
        throw new Error('Didn\'t call update');
      };
      var lastUpdate = mockups.TestCases.updateFields[mockups.TestCases.updateFields.length-1];
      if(lastUpdate.$set === undefined){
        throw new Error('Invalid update!');
      };
      _.each(newData, function(val, key){
        if(lastUpdate.$set[key] !== val){
          throw new Error('Update doesn\'t match on "' + key + '": ' + val);
        };
      });

      // All clear
      wait.finished();
    });
  });
};


exports.test_styleSheetsFromUrl = function(log, wait, mockups){
  var test = new mockups.TestCases.TestCase(_id);
  test.stylesheetsFromUrl('http://google.com/', function(error, result){
    if(error){
      throw new Error('Loadable url should not result in error');
    };
    if(result.indexOf('link-tag-success') === -1){
      throw new Error('Didn\'t work for loadable url');
    };
  });
  test.stylesheetsFromUrl('asfdasdfm/', function(error, result){
    if(result){
      throw new Error('Error should not have result');
    };
    if(!error){
      throw new Error('Error should have produced error');
    };
  });
};

exports.test_getHTML = function(log, wait, mockups){
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
    var test = new mockups.TestCases.TestCase(_id);
    test.getHTML(data.options, function(error, result){
      if(data.successful && error){
        if(typeof error === 'string'){
          error = new Error(error);
        };
        throw error;
      }else if(!data.successful && !error){
        throw new Error('Should have produced error');
      };
      // Result should include fixtureHTML exactly as long as it doesn't
      // have an html tag in it
      var fixtureHTML = data.options.fixtureHTML || test.fixtureHTML;
      if(fixtureHTML.indexOf('<html') === -1 && result.indexOf(fixtureHTML) === -1){
        throw new Error('fixtureHTML not included');
      };
      // Result should have basic tags
      ['html', 'head', 'body'].forEach(function(tag){
        var matcher = new RegExp('\<' + tag + '[^]+\<\/' + tag + '\>', 'i');
        if(!matcher.test(result)){
          throw new Error('Missing tag: ' + tag);
        };
      });

      if(data.options.normativeValue === undefined){
        // CSS Files should be included
        test.cssFiles.split('\n').forEach(function(href){
          if(href.trim() !== '' && result.indexOf(href) === -1){
            throw new Error('CSS File not included: ' + href);
          };
        });
      }else{
        // No links only style tags
        if(/\<link .+rel=\"stylesheet\".+\>/i.test(result) ||
            !/\<style\>[^]+\<\/style\>/i.test(result)){
          throw new Error('Should have style tag and no link tag when passed normative');
        };

      };

      if(data.expected && data.expected.length){
        data.expected.forEach(function(expected){
          if(result.indexOf(expected) === -1){
            throw new Error('Missing: ' + expected);
          };
        });
      };
      if(data.unexpected && data.unexpected.length){
        data.unexpected.forEach(function(unexpected){
          if(result.indexOf(unexpected) !== -1){
          log(result);
            throw new Error('Should not have: ' + unexpected);
          };
        });
      };

      wait.finished();
    });
  });
};


exports.test_getThumbnail = function(log, wait, mockups, asClient){
  var test = new mockups.TestCases.TestCase(_id);
  test.getThumbnail(function(error, result){
    if(error){
      if(typeof error === 'string'){
        error = new Error(error);
      };
      throw error;
    };

    if(result.substr(0, 10) !== 'data:image'){
      throw new Error('Did not return data uri');
    };

    if(!asClient && test.thumbnail === undefined){
      throw new Error('Did not set TestCase.thumbnail');
    };

    wait.done();
  });
  return wait;
};


exports.test_extractStyles = function(log, wait, mockups){
  var test = new mockups.TestCases.TestCase(_id);
  test.extractStyles(function(error, result){
    if(error){
      if(typeof error === 'string'){
        error = new Error(error);
      };
      throw error;
    };
    // Should be the results of phantomjs as a json object for each width
    var expected = mockups.Npm.require('fs').readFileSync('sometest.out');

    test.widthsArray.forEach(function(width){
      if(result[width] === undefined){
        throw new Error('Width not found: ' + width);
      };
      if(JSON.stringify(result[width]) !== expected){
        throw new Error('Does not match mockup');
      };
    });

    wait.done();
  });
  return wait;
};

exports.test_setNormative = function(log, wait, mockups, asClient){
  var test = new mockups.TestCases.TestCase(_id);
  var updateCount = mockups.TestCases.updateIds.length;
  var insertCount = mockups.TestNormatives.insertData.length;
  test.setNormative(function(error, result){
    // Should not error
    if(error){
      if(typeof error === 'string'){
        error = new Error(error);
      };
      throw error;
    };

    // Check result
    if(result._id.substr(0,7) !== 'random-'){
      throw new Error('Missing normative id');
    };
    if(result.testCase !== _id){
      throw new Error('Missing test id');
    };
    if(result.owner !== test.owner){
      throw new Error('Missing test owner');
    };
    if(Math.abs(result.timestamp-Date.now()) > 1000){
      throw new Error('Missing timestamp');
    };

    // Should be the results of phantomjs as a json object for each width
    var expected = mockups.Npm.require('fs').readFileSync('sometest.out');

    test.widthsArray.forEach(function(width){
      if(result.value[width] === undefined){
        throw new Error('Width not found: ' + width);
      };
      if(JSON.stringify(result.value[width]) !== expected){
        throw new Error('Does not match mockup');
      };
    });

    if(mockups.TestCases.updateIds.length === updateCount){
      throw new Error('Did not call TestCases.update');
    };
    var lastId = mockups.TestCases.updateIds[mockups.TestCases.updateIds.length - 1];
    var lastFields = mockups.TestCases.updateFields[mockups.TestCases.updateIds.length -1];
    var secondLastId = mockups.TestCases.updateIds[mockups.TestCases.updateIds.length - 2];
    var secondLastFields = mockups.TestCases.updateFields[mockups.TestCases.updateIds.length -2];
    if(secondLastId !== _id || lastId !== _id){
      throw new Error('Did not call TestCases.update with correct _id');
    };
    if(secondLastFields.$set === undefined || !secondLastFields.$set.hasNormative){
      throw new Error('Did not call TestCases.update with hasNormative: true');
    };

    if(mockups.TestNormatives.insertData.length === insertCount){
      throw new Error('Did not call TestNormatives.insert');
    };
    var lastData = mockups.TestNormatives.insertData[mockups.TestNormatives.insertData.length -1];
    if(lastData !== result){
      throw new Error('Did not call TestNormatives.insert with correct data');
    };

    if(test.hasNormative !== true){
      throw new Error('TestCase.hasNormative not set');
    };

    if(!asClient && test.thumbnail === undefined){
      throw new Error('thumbnail not set');
    };

    wait.done();
  });
  return wait;
};

exports.test_run = function(log, wait, mockups){
  var datas = [
    {},
    {setOnTest: {hasNormative: true},
     shouldPass: true
    },
    {setOnTest: {hasNormative: true},
     shouldPass: false,
     setNormative: {"_id":"random-psAAby4PsP","testCase":"test1","owner":"mr.big","timestamp":1410731849667,"value":{"720":[{"ignore":true,"selector":"HTML","attributes":{"background-color":"#eee"},"rules":[],"children":[]},{"ignore":false,"selector":"BODY>H1","attributes":{"color":"#f50"},"rules":[],"children":[{"ignore":false,"selector":"BODY>H1>EM","attributes":{"font-style":"italic"},"rules":[],"children":[]}]}],"1024":[{"ignore":true,"selector":"HTML","attributes":{"background-color":"#eee"},"rules":[],"children":[]},{"ignore":false,"selector":"BODY>H1","attributes":{"color":"#f00"},"rules":[],"children":[{"ignore":false,"selector":"BODY>H1>EM","attributes":{"font-style":"italic"},"rules":[],"children":[]}]}]}},
     failures: {
       "720": [ { selector: 'BODY>H1',
         key: 'color',
         aVal: '#f50',
         bVal: '#f00',
         aRules: [],
         bRules: [] } ], 
       "1024": []}
    }
  ];
  return multipleDatas(datas, wait, function(data){
    var test = new mockups.TestCases.TestCase(_id);
    if(data.setOnTest){
      _.extend(test, data.setOnTest);
    };
    var backupNormative;
    if(data.setNormative){
      backupNormative = mockups.TestNormatives.sample;
      mockups.TestNormatives.sample = data.setNormative;
    };
    test.run(function(error, result){
      if(data.setNormative){
        mockups.TestNormatives.sample = backupNormative;
      };
      if(!test.hasNormative){
        if(!error){
          throw new Error('Should have thrown \'No normative exists!\'');
        }else{
          return wait.finished();
        };
      };
      // Check fields exist
      if(!result.time instanceof Date){
        throw new Error('Test result Time not set properly');
      };
      if(result._id.substr(0,7) !== 'random-'){
        throw new Error('Test result ID not set properly');
      };
      if(result.normative.substr(0,7) !== 'random-'){
        throw new Error('Test result normative Id not set properly');
      };
      if(result.fixtureHTML !== test.fixtureHTML){
        throw new Error('Test result fixtureHTML not set properly');
      };
      if(result.owner !== test.owner){
        throw new Error('Test result owner not set properly');
      };
      if(result.testCase !== test._id){
        throw new Error('Test result testCase id not set properly');
      };
      if(data.shouldPass && !result.passed){
        throw new Error('Test should have passed!');
      };
      var resultWidthsCount = 0;
      _.each(result.failures, function(viewportFailures, width){
        resultWidthsCount++;
        if(test.widthsArray.indexOf(parseInt(width,10)) === -1){
          throw new Error('Width does not match test: ' + width);
        };
        if(result.passed && viewportFailures.length){
          throw new Error('Passed test should not have failures');
        };
        if(data.failures){
          _.each(data.failures, function(expFailures, width){
            if(result.failures[width].length !== expFailures.length){
              throw new Error('Failures have different length');
            };
            expFailures.forEach(function(failure, i){
              _.each(failure, function(val, key){
                if(val instanceof Array){
                  return; // Do not test aRules, bRules
                };
                if(val !== result.failures[width][i][key]){
                  throw new Error('Failure value mismatch on "' + key + '": ' + val);
                };
              });
            });
          });
        };
      });
      if(resultWidthsCount !== test.widthsArray.length){
        throw new Error('Result widths does not match test widths');
      };

      wait.finished();
    });
  });
};
