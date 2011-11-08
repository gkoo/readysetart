var _u, Backbone, PlayerModel, PlayersCollection, isServer = false;

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
// @isLeader
// @type
PlayerModel = Backbone.Model.extend({
  url: '/player',

  initialize: function() {
    this.set({ 'type': 'player' });
  }
});

PlayersCollection = Backbone.Collection.extend({
  model: PlayerModel,

  url: '/players',

  initialize: function() {
    var _this = this,
        serverFns = ['getCurrentArtist',
                     'hasNextArtist',
                     'getNextArtist',
                     'decideArtistOrder'];

    _u.extend(this, Backbone.Events);
    _u.bindAll(this,
               'getLeader',
               'setPlayerName',
               'handleNewPlayer',
               'playerUpdate',
               'playerDisconnect');

    // take care of server-side stuff context-binding.
    // Backbone/underscore's way of extending makes
    // this hard to decouple.
    _u.each(serverFns, function(fn) {
      if (this[fn]) {
        _u.bind(this[fn], this);
      }
    });
    this.bind('remove', function(models) {
      _this.trigger('removedPlayer', models);
    });
  },

  getLeader: function() {
    return this.find(function(player) {
      return player.get('isLeader');
    });
  },

  setPlayerName: function(o) {
    var playerModel = this.get(o.id);
    if (playerModel) {
      playerModel.save({ 'name': o.name });
    }
    else {
      console.log("[err] couldn't find player. something is wrong.");
    }
  },

  // add a listing for a new player who has just connected
  // TODO: add a "add" binding to playerscollection to render a new playerview
  handleNewPlayer: function(o) {
    this.add(o);
  },

  playerUpdate: function(o) {
    try {
      this.get(o.id).set(o);
    }
    catch (e) {
      console.log(e);
    }
  },

  playerDisconnect: function(id) {
    var playerToRemove = this.get(id);
    if (playerToRemove) {
      this.remove(playerToRemove);
    }
    else {
      console.log('[err] couldn\'t find player to remove');
    }
  }
});

if (isServer) {
  exports.PlayerModel = PlayerModel;
  exports.PlayersCollection = PlayersCollection;
}
