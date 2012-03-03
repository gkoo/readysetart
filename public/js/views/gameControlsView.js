var GameControlsView = Backbone.View.extend({
  initialize: function() {
    _.extend(this, Backbone.Events);
    _.bindAll(this, 'doEndTurn',
                    'doStartGame',
                    'toggleFreeDraw',
                    'updateControls');
    this.startBtn = $('.startGameBtn').removeAttr('disabled');
    this.endBtn = $('.endTurnBtn').attr('disabled', 'disabled');
  },

  events: {
    'click .endTurnBtn': 'doEndTurn',
    'click .startGameBtn': 'doStartGame',
    'change #freedraw': 'toggleFreeDraw'
  },

  doEndTurn: function() {
    this.trigger('endTurn');
  },

  doStartGame: function() {
    var data = { 'gameControls:gameStatus': GameStatusEnum.IN_PROGRESS };
    this.trigger('gameControls:gameStatus', { 'eventName': 'gameStatus',
                                 'data': data });
    this.updateControls(GameStatusEnum.IN_PROGRESS);
  },

  toggleFreeDraw: function() {
    if (this.$('#freedraw').attr('checked')) {
      console.log('freedraw true');
      this.trigger('gameControls:freeDraw', true);
    }
    else {
      console.log('freedraw false');
      this.trigger('gameControls:freeDraw', false);
    }
  },

  updateControls: function(o) {
    if (o.gameStatus === GameStatusEnum.IN_PROGRESS) {
      this.startBtn.attr('disabled', 'disabled');
      this.endBtn.removeAttr('disabled');
    }
    else if (o.gameStatus === GameStatusEnum.FINISHED) {
      this.startBtn.removeAttr('disabled');
      this.endBtn.attr('disabled', 'disabled');
    }
  },

  showControls: function() {
    this.el.show();
  }
});
