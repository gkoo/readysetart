// Extend client-side players model with some server-side specific
// functionality.

var _u        = require('underscore'),
    Backbone  = require('backbone'),
    playerLib = require('./public/js/models/playerModel.js'),

PlayersCollection = playerLib.PlayersCollection.extend({
  getCurrentArtist: function() {
    return this.artistOrder && this.pos >= 0 && this.artistOrder.length ? this.artistOrder[0] : 0;
  },

  hasNextArtist: function() {
    return this.artistOrder && this.pos < this.artistOrder.length - 1;
  },

  getNextArtist: function() {
    if (!this.artistOrder || !this.artistOrder.length) {
      console.log('[err] something is wrong, no artistOrder.');
      return 0;
    }
    if (this.pos >= this.artistOrder.length - 1) {
      console.log('[err] getNextArtist: no artists left');
      return 0;
    }
    return this.artistOrder[++this.pos];
  },

  decideArtistOrder: function() {
    // TODO: Figure out if underscore 1.2.0 exists in NodeJS
    /*
    var tmpOrder = [];
    this.each(function(player) {
      tmpOrder.push(player.id);
    });
    this.artistOrder = _u.shuffle(tmpOrder);
    */
    var len, idx, artistId,
        playerIds = this.map(function(player) { return player.id; });

    // Random insert into artistOrder
    this.artistOrder = [];
    len = playerIds.length;
    while (playerIds.length > 0) {
      idx = Math.floor(Math.random() * playerIds.length);
      artistId = playerIds.splice(idx, 1);
      this.artistOrder.push(artistId[0]);
      len = playerIds.length;
    }
    this.pos = -1;
  }
});

exports.PlayersCollection = PlayersCollection;
