Meteor.startup(function () {
  // code to run on server at startup
});

Meteor.publish("TestCases", function () {
  //return TestCases.find();
  if(this.userId==null){
    return [];
  };
  return TestCases.find({$or: [{invited: this.userId}, {owner: this.userId}]});
});
