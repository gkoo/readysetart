var GameStatusView = Backbone.View.extend({
  initialize: function(o) {
    try {
      _.bindAll(this, 'render', 'renderTimeLeft');
      this.model.bind('change', this.render);
      this.getPlayerById  = o.getPlayerById;
      this.statusEl       = this.$('.status');
      this.artistEl       = this.$('.artist');
      this.timeLeftEl     = this.$('.timeLeft');
      this.render();
    }
    catch(e) {
      console.log(e);
    }
  },

  render: function() {
    var currArtistId = this.model.get('currArtist'),
        turnEnd      = this.model.get('turnEnd'),
        artistPlayer;

    if (this.model.get('gameStatus') === GameStatusEnum.IN_PROGRESS) {
      this.$('.status').text('Game has started.');
    }

    if (turnEnd) {
      this.turnEnd = turnEnd;
      this.timerInterval = setInterval(this.renderTimeLeft, 1000);
      this.renderTimeLeft();
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
  },

  renderTimeLeft: function() {
    var time = new Date(),
        timeLeft = (this.turnEnd - time)/1000; // in seconds
    timeLeft = Math.floor(timeLeft); // round to integer
    if (timeLeft < 0 && this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    else {
      this.timeLeftEl.text(timeLeft + ' seconds');
    }
  },
});
