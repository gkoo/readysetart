var GameStatusView = Backbone.View.extend({
  initialize: function(o) {
    try {
      _.bindAll(this, 'render');
      this.model.bind('change', this.render);
      this.getPlayerById  = o.getPlayerById;
      this.render();
      this.statusEl       = this.$('.status');
      this.artistEl       = this.$('.artist');
    }
    catch(e) {
      console.log(e);
    }
  },

  render: function() {
    var currArtistId = this.model.get('currArtist'),
        artistPlayer;

    if (this.model.get('gameStatus') === GameStatusEnum.IN_PROGRESS) {
      this.$('.status').text('Game has started.');
    }

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
  }
});
