var GameControlsView = Backbone.View.extend({
  initialize: function() {
    _.extend(this, Backbone.Events);
    _.bindAll(this, 'doEndTurn',
                    'doStartGame',
                    'updateControls');
    this.startBtn = $('.startGameBtn').removeAttr('disabled');
    this.endBtn = $('.endTurnBtn').attr('disabled', 'disabled');
  },

  events: {
    'click .endTurnBtn': 'doEndTurn',
    'click .startGameBtn': 'doStartGame'
  },

  doEndTurn: function() {
    this.trigger('endTurn');
  },

  doStartGame: function() {
    var data = { 'gameStatus': GameStatusEnum.IN_PROGRESS };
    this.trigger('gameStatus', { 'eventName': 'gameStatus',
                                 'data': data });
    this.updateControls(GameStatusEnum.IN_PROGRESS);
  },

  updateControls: function(o) {
    if (o.gameStatus === GameStatusEnum.IN_PROGRESS) {
      this.startBtn.attr('disabled', 'disabled');
      this.endBtn.removeAttr('disabled');
    }
  },

  showControls: function() {
    this.el.show();
  }
});
