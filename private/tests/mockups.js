
exports.meteorServer = {
  isServer: true,
  isClient: false,
  bindEnvironment: function(func){
    return func;
  },
};

var TestCases = {
  findOne: function(id){
    if(id==='test1'){
      return {
        title: 'Mockup TestCase 1',
        description: 'Mock Description',
        interval: '1',
        remoteStyles: 'http://www.test.com/',
        widths: '1024,720',
        cssFiles: 'http://test.com/sample.css\nhttp://test.com/reset.css',
        fixtureHTML: '<div id="cattle" test-ignore>\n' +
                     '<h1>Nobody\'s kiddin\' nobody about where it goes</h1>\n' +
                     '<h2>Waitin\' on the ghost of Tom Joad</h2>\n</div>'
      };
    };
  },
  updateFields: [],
  updateOptions: [],
  updateIds: [],
  update: function(id, fields, options, callback){
    TestCases.updateIds.push(id);
    TestCases.updateFields.push(fields);
    TestCases.updateOptions.push(options);
    if(callback){
      var error, result = 'inserted_id';
      callback(error, result);
    };
  }
};

exports.testCases = TestCases;
