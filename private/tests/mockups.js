
var Meteor = exports.Meteor = {
  isServer: true,
  isClient: false,
  userId: 'mr.big',
  bindEnvironment: function(func){
    return func;
  },
  call: function(key, options, callback){
    var result;
    // At the start of each client test, Meteor is set to client
    Meteor.isServer = true;
    Meteor.isClient = false;
    try{
      result = Meteor._methodsCache[key].call(Meteor, options);
    }catch(error){
      if(callback){
        callback(error, undefined);
        callback = undefined;
      };
    };
    // Success
    if(callback){
      callback(undefined, result);
    };
  },
  Collection: function(key){
    var collection = collections[key];
    for(var i in collection){
      if(collection.hasOwnProperty(i)){
        this[i] = collection[i];
      };
    };
    collections[key] = this;
    exports[key] = this;
    if(this.allow === undefined){
      this.allow = function(options){};
    };
    if(this.find === undefined){
      this.find = function(options){};
    };
  },
  publish: function(key, func){
  },
  startup: function(func){
  },
  _methodsCache: {},
  methods: function(options){
    for(var i in options){
      if(options.hasOwnProperty(i)){
        Meteor._methodsCache[i] = options[i];
      };
    };
  },
  Error: function(code, msg){
    throw code + ': ' + msg;
  }

};

var collections = {};

exports.TestCases = {
  findOne: function(id){
    if(id==='test1'){
      return {
        _id: id,
        owner: 'mr.big',
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
    exports.TestCases.updateIds.push(id);
    exports.TestCases.updateFields.push(fields);
    exports.TestCases.updateOptions.push(options);
    if(callback){
      var error, result = 'inserted_id';
      callback(error, result);
    };
  }
};
collections.TestCases = exports.TestCases;

exports.TestNormatives = {
  sample: {"_id":"random-psAAby4PsP","testCase":"test1","owner":"mr.big","timestamp":1410731849667,"value":{"720":[{"ignore":true,"selector":"HTML","attributes":{"background-color":"#eee"},"rules":[],"children":[]},{"ignore":false,"selector":"BODY>H1","attributes":{"color":"#f00"},"rules":[],"children":[{"ignore":false,"selector":"BODY>H1>EM","attributes":{"font-style":"italic"},"rules":[],"children":[]}]}],"1024":[{"ignore":true,"selector":"HTML","attributes":{"background-color":"#eee"},"rules":[],"children":[]},{"ignore":false,"selector":"BODY>H1","attributes":{"color":"#f00"},"rules":[],"children":[{"ignore":false,"selector":"BODY>H1>EM","attributes":{"font-style":"italic"},"rules":[],"children":[]}]}]}},
  insertData: [],
  insert: function(data, callback){
    exports.TestNormatives.insertData.push(data);
    if(callback){
      callback.call()
    };
  },
  find: function(query, options){
    return {
      fetch: function(){
        return [exports.TestNormatives.sample];
      }
    };
  }
};
collections.TestNormatives = exports.TestNormatives;

exports.TestHistory = {
  insertData: [],
  insert: function(data, callback){
    exports.TestHistory.insertData.push(data);
    if(callback){
      callback.call()
    };
  }
};
collections.TestHistory = exports.TestHistory;

var phantomPath = '/path/to/phantomjs';
var phantomPathSheetsFromUrl = 'assets/app/phantom/getSheetsFromUrl.js';
var phantomPathExtractStyles = 'assets/app/phantom/extractStyles.js';
exports.Npm = {
  require: function(packageName){
    switch(packageName){
      case 'phantomjs':
        return {path: phantomPath};
        break;
      case 'child_process':
        return {spawn: function(path, args){
          var command = {stdout: {}, stderr: {}};
          if(path !== phantomPath){
            return undefined;
          };
          switch(args[0]){
            case phantomPathSheetsFromUrl:
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
              break;
            case phantomPathExtractStyles:
              command.on = function(type, eventFunc){
                if(type==='exit'){
                  // Script should always succeed, tested elsewhere
                  eventFunc(0);
                };
              };
              command.stdout.on =
              command.stderr.on = function(type, eventFunc){
                // No Errors reported this way
              };
              return command;
              break;
          };
        }};
        break;
      case 'fs':
        return {
          writeFile: function(filename, contents, callback){
            if(callback){
              callback();
            };
          },
          readFileSync: function(filename){
            // For extractStyles
            if(filename.substr(-4) === '.out'){
              return JSON.stringify([
                {ignore: true,
                 selector: 'HTML',
                 attributes: {'background-color': '#eee'},
                 rules: [],
                 children: []},
                {ignore: false,
                 selector: 'BODY>H1',
                 attributes: {'color': '#f00'},
                 rules: [],
                 children: [
                    {ignore: false,
                     selector: 'BODY>H1>EM',
                     attributes: {'font-style': 'italic'},
                     rules: [],
                     children: []}
                 ]}
              ]);
            };
          },
          unlink: function(filename, callback){
            if(callback){
              callback();
            };
          }
        };
        break;
      case 'fibers/future': 
        return require('./node_modules/fibers/future');
        break;
    };
  }
};

exports.Random = {
  id: function(){
    var length = 10, 
        text = "",
        possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789";
    for( var i=0; i < length; i++ ){
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    };
    return 'random-' + text;
  }
};
