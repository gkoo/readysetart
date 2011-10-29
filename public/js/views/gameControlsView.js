var GameControlsView = Backbone.View.extend({
  initialize: function() {
    _.extend(this, Backbone.Events);
    _.bindAll(this, 'doEndTurn',
                    'doStartGameAndBroadcast',
                    'updateControls');
  },

  events: {
    'click .endTurnBtn': 'doEndTurn',
    'click .startGameBtn': 'doStartGameAndBroadcast'
  },

  doEndTurn: function() {
    this.trigger('endTurn');
  },

  doStartGameAndBroadcast: function() {
    socket.emit('gameStatus', gameStatus.IN_PROGRESS);
    this.trigger('gameStatus', gameStatus.IN_PROGRESS);
    this.updateControls(gameStatus.IN_PROGRESS);
  },

  updateControls: function(status) {
    if (status == gameStatus.IN_PROGRESS) {
      this.$('.startGameBtn').attr('disabled', 'disabled');
      this.$('.endTurnBtn').removeAttr('disabled');
    }
  },

  showControls: function() {
    this.el.show();
  }
});
