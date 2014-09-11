#!/usr/bin/env nodejs

// Specify files which contain tests for TestCase
// e.g.: exports.testKey = function(TestCases, console.log, wait)
// For async, return wait; then in callback: wait.done();
var tests = ['TestCase'];

var fs = require('fs');
var _ = require('./lib/underscore-min');
var colors = require('./lib/colors');

console.log('CSS-Unit-Test App Unit Test Suite'.bold);
console.log('Must be run from app root directory!'.italic.inverse);

var mockups = require('./mockups');

// Load TestCase class
(function(Meteor, TestCases){
  // Refers to the actual source file
  var fileContents = fs.readFileSync('TestCase.js', "utf8");
  eval(fileContents);
})(mockups.meteorServer, mockups.testCases);

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

  _.each(available, function(test, testKey){
    var status;
    var wait = {
      done: function(){
        var passed = status === undefined;
        testComplete++;
        testFailures += passed ? 0 : 1;
        testStatus[testFile][testKey] = passed ? true : status;
        if(testComplete === testCount){
          allDone();
        };
      }
    };
    var retval;
    try{
      retval = test(mockups.testCases, logClosure(testFile, testKey), wait);
    }catch(error){
      status = error;
    };
    if(retval !== wait){
      wait.done();
    };
  });
});
