// TODO: show game status messages in chat
Pictionary.GameStatusView = Backbone.View.extend({
  initialize: function(o) {
    _.bindAll(this);
    this.getPlayerById = o.getPlayerById;
    this.$statusEl      = this.$('.status .value');
    this.$artistEl      = this.$('.artist .value');
    this.$timeLeftEl    = this.$('.timeLeft .value');
    this.render();

    this.model.bind('change:gameStatus', this.renderStatus);
    this.model.bind('change:currArtist', this.renderCurrArtist);
    this.model.bind('change:timeLeft',   this.renderTimeLeft);
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
    this.renderStatus(null, status);
    this.$el.show();
  },

  renderTimeLeft: function() {
    this.$timeLeftEl.text(this.model.get('timeLeft'));
  },

  renderStatus: function(model, status) {
    if (status === Pictionary.statusEnum.IN_PROGRESS) {
      this.$statusEl.text('Started');
    }
    else if (status === Pictionary.statusEnum.FINISHED) {
      this.$statusEl.text('Ended.');
    }
  },

  renderCurrArtist: function(model, artistId) {
    var artistPlayer;
    if (artistId === -1) {
      this.$artistEl.text('No one');
      return;
    }

    artistPlayer = this.getPlayerById(artistId);
    // TODO: Need to add this method back in.
    if (artistPlayer) {
      this.$artistEl.text(artistPlayer.get('name'));
    }
    else {
      console.log('[err] Couldn\'t find player matching currArtist Id.');
    }
  }
});
