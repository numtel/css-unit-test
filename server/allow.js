ServerObject.allow({
  'CssTest': {
    ref: CssTest,
    allowConstructor: function(args){
      // If creating new, owner must be set to userId
      if(args.length > 0 && 
         (args[0] == null || 
           (typeof args[0] === 'object' && 
           args[0].owner !== Meteor.userId()))){
        return false;
      };
      return true;
    },
    filterInstances: function(){
      // Only allow loading instances with owner set to userId
      if(this.owner !== Meteor.userId()){
        return undefined;
      };
      return this;
    }
  }
});
