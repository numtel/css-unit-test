

var AppRouter = Backbone.Router.extend({
  routes: {
    ":TestId": "main"
  },
  main: function (testId) {
    var oldTest = Session.get("selected");
    if (oldTest !== testId) {
      Session.set("selected", testId);
    }
  },
  setTest: function (testId) {
    this.navigate(testId, true);
  }
});

Router = new AppRouter;

Meteor.startup(function () {
  Backbone.history.start({pushState: true});
});
