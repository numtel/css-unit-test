
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

var phantomPath = '/path/to/phantomjs';
var phantomPathSheetsFromUrl = 'assets/app/phantom/getSheetsFromUrl.js';
exports.npm = {
  require: function(packageName){
    switch(packageName){
      case 'phantomjs':
        return {path: phantomPath};
        break;
      case 'child_process':
        return {spawn: function(path, args){
                          var command = {stdout: {}, stderr: {}};
                          if(path === phantomPath &&
                              args[0] === phantomPathSheetsFromUrl){
                            command.on = function(type, eventFunc){
                              if(type==='exit'){
                                // Script should always succeed, tested elsewhere
                                eventFunc(0);
                              };
                            };
                            command.stdout.on = function(type, eventFunc){
                              if(type==='data'){
                                if(/http.?\:\/\/.*\//.test(args[1])){
                                  // Give mockup result
                                  eventFunc('link-tag-success');
                                }else{
                                  // Give error if not a url
                                  eventFunc('##ERROR##');
                                };
                              };
                            };
                            command.stderr.on = function(type, eventFunc){
                              // No Errors reported this way
                            };
                            return command;
                          };
                        }
                };
        break;
    };
  }
};
