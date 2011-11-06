var _u, Backbone, GameStatusEnum, GameStatusModel, gameStatus, isServer = false;

// Set up dependencies.
if (typeof module !== 'undefined') {
  isServer  = true;
  _u        = require('underscore');
  Backbone  = require('backbone');
}
else {
  _u = _;
}

GameStatusEnum = {
  NOT_STARTED : 0,
  IN_PROGRESS : 1,
  FINISHED    : 2
};

GameStatusModel = Backbone.Model.extend({
  initialize: function() {
    this.set({ 'type': 'gameStatus' });
  },

  validate: function(attrs) {
    if (typeof attrs.status !== 'undefined') {
      if (attrs.status !== GameStatusEnum.NOT_STARTED
          || attrs.status !== GameStatusEnum.IN_PROGRESS
          || attrs.status !== GameStatusEnum.FINISHED) {
        return 'Unrecognized game status: ' + attrs.status;
      }
    }
  }
});

if (typeof exports !== 'undefined') {
  exports.GameStatusEnum = GameStatusEnum;
  exports.GameStatusModel = GameStatusModel;
}
