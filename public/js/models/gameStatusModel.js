var prevBackbone = Backbone;

(function () {
  var Backbone, _u, isServer = false;

  // Set up dependencies.
  if (typeof exports !== 'undefined') {
    isServer  = true;
    _u        = require('underscore');
    Backbone  = require('backbone');
  }
  else {
    _u = _;
    Backbone = prevBackbone;
  }

  // Initialize Pictionary if it doesn't exist.
  Pictionary = typeof Pictionary === 'undefined' ? {} : Pictionary;

  Pictionary.GameStatusEnum = {
    NOT_STARTED : 0,
    IN_PROGRESS : 1,
    FINISHED    : 2
  };

  Pictionary.GameStatusModel = Backbone.Model.extend({
    initialize: function() {
      this.set({ 'type': 'gameStatus' });
    },

    validate: function(attrs) {
      if (typeof attrs.status !== 'undefined') {
        if (attrs.status !== Pictionary.GameStatusEnum.NOT_STARTED ||
            attrs.status !== Pictionary.GameStatusEnum.IN_PROGRESS ||
            attrs.status !== Pictionary.GameStatusEnum.FINISHED) {
          return 'Unrecognized game status: ' + attrs.status;
        }
      }
    }
  });

  if (typeof exports !== 'undefined') {
    exports.GameStatusEnum = Pictionary.GameStatusEnum;
    exports.GameStatusModel = Pictionary.GameStatusModel;
  }
})();
