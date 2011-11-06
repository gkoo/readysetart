// Extend client-side players model with some server-side specific
// functionality.

var _u        = require('underscore'),
    Backbone  = require('backbone'),
    playerLib = require('./public/js/models/playerModel.js'),

PlayersCollection = playerLib.PlayersCollection.extend({
  getCurrentArtist: function() {
    return this.artistOrder && this.artistOrder.length ? this.artistOrder[0] : 0;
  },

  hasNextArtist: function() {
    return this.artistOrder && this.artistOrder.length > 1;
  },

  getNextArtist: function() {
    if (!this.artistOrder || !this.artistOrder.length) {
      console.log('[err] something is wrong, no artistOrder.');
      return 0;
    }
    if (this.artistOrder.length === 1) {
      console.log('[err] getNextArtist: no artists left');
      return 0;
    }
    this.artistOrder.splice(0, 1);
    return this.artistOrder[0];
  },

  decideArtistOrder: function() {
    // TODO: Figure out of underscore 1.2.0 exists in NodeJS
    /*
    var tmpOrder = [];
    this.each(function(player) {
      tmpOrder.push(player.id);
    });
    this.artistOrder = _u.shuffle(tmpOrder);
    */
    var tmpOrder = [], len, idx, artistId;
    this.each(function(player) {
      tmpOrder.push(player.id);
    });

    // Random insert into artistOrder
    this.artistOrder = [];
    len = tmpOrder.length;
    while (tmpOrder.length > 0) {
      idx = Math.floor(Math.random() * tmpOrder.length);
      artistId = tmpOrder.splice(idx, 1);
      this.artistOrder.push(artistId[0]);
      len = tmpOrder.length;
    }
  }
});

exports.PlayersCollection = PlayersCollection;
