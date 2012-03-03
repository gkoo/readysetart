// TODO: show game status messages in chat
var GameStatusView = Backbone.View.extend({
  initialize: function(o) {
    try {
      _.bindAll(this, 'render',
                      'renderTimeLeft',
                      'renderStatus',
                      'renderCurrArtist');
      this.getPlayerById = o.getPlayerById;
      this.statusEl      = this.$('.status');
      this.artistEl      = this.$('.artist');
      this.timeLeftEl    = this.$('.timeLeft');
      this.render();
    }
    catch(e) {
      console.log(e);
    }
  },

  render: function() {
    var currArtistId = this.model.get('currArtist'),
        status       = this.model.get('gameStatus'),
        artistPlayer;

    if (currArtistId) {
      artistPlayer = this.getPlayerById(currArtistId);
      if (artistPlayer) {
        this.$('.artist').text(artistPlayer.get('name') + ' is currently drawing');
      }
      else {
        console.log('[err] Couldn\'t find player matching currArtist Id.');
      }
    }
    this.el.show();
  },

  renderTimeLeft: function() {
    this.timeLeftEl.text(this.model.get('timeLeft') + ' seconds');
  },

  renderStatus: function(model, status) {
    if (status === GameStatusEnum.IN_PROGRESS) {
      this.statusEl.text('Game has started.');
    }
    else if (status === GameStatusEnum.FINISHED) {
      this.statusEl.text('Game has ended.');
    }
  },

  renderCurrArtist: function() {
    var currArtistId = this.model.get('currArtist'),
        artistPlayer;

    if (currArtistId) {
      // TODO: Need to add this method back in.
      artistPlayer = this.getPlayerById(currArtistId);
      if (artistPlayer) {
        this.$('.artist').text(artistPlayer.get('name') + ' is currently drawing');
      }
      else {
        console.log('[err] Couldn\'t find player matching currArtist Id.');
      }
    }
  }
});
