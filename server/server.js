Meteor.startup(function () {
  // code to run on server at startup
});

Meteor.publish("TestCases", function () {
  return TestCases.find();
});
