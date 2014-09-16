#!/usr/bin/env nodejs

// Specify files which contain tests for TestCase
// e.g.: exports.testKey = function(TestCases, console.log, wait, asClient)
// For async, return wait; then in callback: wait.done();
var tests = ['TestCase'];

var fs = require('fs');
var _ = require('./node_modules/underscore-min');
var colors = require('./node_modules/colors');

console.log('CSS-Unit-Test App Unit Test Suite'.bold);

// Check if running from root by context
if(!fs.existsSync('private/tests/main.js')) {
  console.log('Must be run from app root directory!'.red.italic.inverse);
  process.exit(1);
};

console.time('Run Time');

var mockups = require('./mockups');

// Load TestCase class in its expected context
(function(Meteor, 
          Npm, 
          Random){
  // Refers to the actual source file
  var wrappedSrc = function(filename){
    var src = fs.readFileSync(filename, 'utf8');
    return '(function(){' + src + '})();';
  };
  eval(wrappedSrc('server/TestCases.js'));
  eval(wrappedSrc('TestCase.js'));
})(mockups.Meteor, 
   mockups.Npm, 
   mockups.Random);

var lastLog, logClosure = function(testFile, testKey){
  return function(val){
    var testAddr = testFile + '.' + testKey;
    if(lastLog !== testAddr){
      console.log(('\nTest Log: ' + testAddr + ': ').magenta);
      lastLog = testAddr;
    };
    console.log(val);
  };
};

// Count the tests
var testCount = 0;
tests.forEach(function(testFile){
  var available = require('./' + testFile);
  _.each(available, function(test, testKey){
    testCount++;
  });
});
testCount*=2;

var testStatus = {}, testComplete = 0, testFailures = 0;

var allDone = function(){
  // Print output
  var passPercent = Math.round((testCount - testFailures) / testCount * 100);
  if(passPercent === 100){
    console.log(('\nAll ' + testCount + ' tests passed successfully!').green);
  }else{
    console.log(('\n' + passPercent + '% of tests passed').red);
    console.log(testFailures + ' out of ' + testCount + ' tests failed.');
  };

  _.each(testStatus, function(testResults, testFile){
    _.each(testResults, function(result, testKey){
      if(result !== true){
        console.log(('\nTest Error: ' + testFile + '.' + testKey + ': ').red);
        if(typeof result === 'string'){
          console.log(result);
        }else if(result.stack){
          console.log(result.stack);
        }
      };
    });
  });

  console.timeEnd('Run Time');

  // Exit with code
  if(passPercent === 100){
    process.exit(code=0);
  }else{
    process.exit(1);
  };
};

// Run each test
tests.forEach(function(testFile){
  var available = require('./' + testFile);

  testStatus[testFile] = {};

  for(var asClient=0; asClient < 2; asClient++){
    _.each(available, function(test, testKey){
      var status;
      var wait = {
        done: function(){
          var passed = status === undefined;
          testComplete++;
          testFailures += passed ? 0 : 1;
          testStatus[testFile][testKey + (asClient ? '-client' : '')] = 
            passed ? true : status;
          if(testComplete === testCount){
            allDone();
          };
        }
      };
      if(asClient){
        mockups.Meteor.isServer = false;
        mockups.Meteor.isClient = true;
      };
      var retval;
      try{
        retval = test(logClosure(testFile, testKey), wait, mockups, asClient);
      }catch(error){
        status = error;
      };
      if(retval !== wait){
        wait.done();
      };
    });
  };
});
