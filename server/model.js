TestCases = new Meteor.Collection("TestCases"); // Parent Collection
TestNormatives = new Meteor.Collection("TestNormatives");
TestHistory = new Meteor.Collection("TestHistory");

TestCases.allow({
  insert: function (userId, test) {
    return false; // no cowboy inserts -- use createTest method
  },
  update: function (userId, test, fields, modifier) {
    if (userId !== test.owner)
      return false; // not the owner

    // Only allow updating sort order, otherwise use editTest method
    var allowed = ['rank'];
    return _.difference(fields, allowed).length === 0;
  },
  remove: function (userId, test) {
    return test.owner === userId;
  }
});


var validatePost = function(data, isCreate){
  var validators = {
    string: function(key, value, label, options){
      if(options.min !== undefined && value.length < options.min){
        return label + ' too short';
      };
      if(options.max !== undefined && value.length > options.max){
        return label + ' too long';
      };
      return true;
    },
    integerList: function(key, value, label, options){
      if(!/^[0-9,\s]+$/.test(value)){
        return label + ' may only include numbers, commas, and spaces';
      };
      return true;
    }
  };
  var fieldDefs = {
    title: ['Title', 'string', {min: 1, max: 100}],
    description: ['Description', 'string', {min: 1, max: 1000}],
    cssFiles: ['CSS Files', 'string', {min: 1, max: 10000}],
    fixtureHTML: ['Fixture HTML', 'string', {min: 1, max: 100000}],
    widths: ['Test Resolution Widths', 'integerList', {}],
  };
  var validate = function(key, value){
    if(fieldDefs.hasOwnProperty(key)){
      return validators[fieldDefs[key][1]](key, value, fieldDefs[key][0], fieldDefs[key][2])
    };
    return 'Post error!';
  };
  if(!isCreate){
    fieldDefs['_id'] = ['ID', 'string', {min:1, max:100}];
    // Modifying a test, ensure that each passed value matches
    _.each(data, function(value, key){
      var result = validate(key, value);
      if(result !== true){
        throw new Meteor.Error(413, result);
      };
    });
  }else{
    // Creating a test, make sure every field validates
    _.each(fieldDefs, function(options, key){
      var result = validate(key, data[key]);
      if(result !== true){
        throw new Meteor.Error(413, result);
      };
    });
  };
};

Meteor.methods({
  createTest: function (options) {
    validatePost(options, true);

    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");

    var id = options._id || Random.id();
    TestCases.insert({
      _id: id,
      rank: 0,
      owner: this.userId,
      title: options.title,
      description: options.description,
      cssFiles: options.cssFiles,
      widths: options.widths,
      fixtureHTML: options.fixtureHTML
    });
    return id;
  },
  editTest: function (options) {
    validatePost(options, false);

    var current = new TestCases.TestCase(options._id);

    if (current.notFound)
      throw new Meteor.Error(403, "Invalid test case");

    var data = {
      title: options.title,
      description: options.description,
      cssFiles: options.cssFiles,
      widths: options.widths,
      fixtureHTML: options.fixtureHTML,
    };

    current.setData(data);

    return options._id;
  }
});

