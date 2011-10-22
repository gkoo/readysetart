var _u, Backbone, isServer = false;

// Set up dependencies.
if (typeof module !== 'undefined') {
  isServer  = true;
  _u        = require('underscore');
  Backbone  = require('backbone');
}
else {
  _u = _;
}

// Properties:
// @id
// @name
// @isUser
// @type
PlayerModel = Backbone.Model.extend({
  initialize: function() {
    this.set({ 'type': 'player' });
  }
});

PlayersCollection = Backbone.Collection.extend({
  model: PlayerModel
});

if (isServer) {
  exports.PlayerModel = PlayerModel;
  exports.PlayersCollection = PlayersCollection;
}
