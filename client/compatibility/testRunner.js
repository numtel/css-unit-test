var CssTest = {};
(function(){

  var filterRules = [
    /^cssText$/,
    /^webkit/
  ];

  CssTest.extractComputedStyles = function(base, baseSelector){
    if(baseSelector === undefined){
      baseSelector = '';
    };
    var output = [];
    _.each(base.children, function(child, i){
      var selector = baseSelector + '>' + child.nodeName + 
                     (child.id ? '#' + child.id : '') +
                     ':nth-child(' + (i+1) + ')';
      output.push({
        selector: selector,
        styles: window.getComputedStyle(child),
        children: CssTest.extractComputedStyles(child, selector)
      });
    });
    return output;
  };

  CssTest.compareStyles = function(a, b){
    if(a.length !== b.length){
      throw 'Fixture changed! New normative needed!';
    };
    var failures = [];
    for(var i = 0; i<a.length; i++){
      _.each(a[i].styles, function(aVal, key){
        var skip;
        filterRules.forEach(function(rule){
          if(rule.test(key)){
            skip = true;
          };
        });
        if(skip){
          return;
        };
        var bVal = b[i].styles[key];
        if(bVal !== aVal){
          failures.push({
            'selector': a[i].selector,
            'key': key,
            'aVal': aVal,
            'bVal': bVal
          });
        };
      });
    };
    return failures;
  };

})();
