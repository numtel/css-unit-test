

var AppRouter = Backbone.Router.extend({
  routes: {
    ":TestId": "details",
    "": "dashboard"
  },
  dashboard: function(){
    Session.set("selected", null);
  },
  details: function (testId) {
    var oldTest = Session.get("selected");
    if (oldTest !== testId) {
      Session.set("selected", testId);
    }
  },
});

Router = new AppRouter;

Meteor.startup(function () {
  Backbone.history.start({pushState: true});
});
