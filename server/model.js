/*
 * CSS Unit Testing Application
 * ben@latenightsketches.com
 */

TestCases = new Meteor.Collection("TestCases");

TestCases.allow({
  insert: function (userId, test) {
    return false; // no cowboy inserts -- use createTest method
  },
  update: function (userId, test, fields, modifier) {
    if (userId !== test.owner)
      return false; // not the owner

    var allowed = ["rank", "title", "description", "cssFiles", "fixtureHTML"];
    if (_.difference(fields, allowed).length)
      return false; // tried to write to forbidden field

    // A good improvement would be to validate the type of the new
    // value of the field (and if a string, the length.) In the
    // future Meteor will have a schema system to makes that easier.
    return true;
  },
  remove: function (userId, test) {
    // You can only remove parties that you created and nobody is going to.
    return test.owner === userId;
  }
});


var NonEmptyString = Match.Where(function (x) {
  check(x, String);
  return x.length !== 0;
});


Meteor.methods({
  createTest: function (options) {
    check(options, {
      title: NonEmptyString,
      description: NonEmptyString,
      cssFiles: NonEmptyString,
      fixtureHTML: NonEmptyString,
      _id: Match.Optional(NonEmptyString)
    });

    if (options.title.length > 100)
      throw new Meteor.Error(413, "Title too long");
    if (options.description.length > 1000)
      throw new Meteor.Error(413, "Description too long");
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
      fixtureHTML: options.fixtureHTML
    });
    return id;
  }
});

