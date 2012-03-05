var GameControlsView = Backbone.View.extend({
  initialize: function(o) {
    _.extend(this, Backbone.Events);
    _.bindAll(this, 'doEndTurn',
                    'doStartGame',
                    'toggleFreeDraw',
                    'enableFreeDrawBtn',
                    'disableFreeDrawBtn',
                    'updateControls',
                    'showControls');
    this.startBtn = this.$('.startGameBtn').removeAttr('disabled');
    this.endBtn = this.$('.endTurnBtn').attr('disabled', 'disabled');
    this.freeDrawBtn = this.$('#freedraw').removeAttr('disabled'); // TODO: why does Firefox persist this attr?
    if (o.freeDraw) {
      this.freeDrawBtn.attr('checked', 'checked');
    }
    else {
      this.freeDrawBtn.removeAttr('checked');
    }
  },

  events: {
    'click .clearBtn': 'clearBoard',
    'click .debug': 'debug',
    'click .endTurnBtn': 'doEndTurn',
    'click .startGameBtn': 'doStartGame',
    'change #freedraw': 'toggleFreeDraw'
  },

  clearBoard: function () {
    this.trigger('gameControls:clearBoard', { 'eventName': 'clearBoard' });
  },

  debug: function() {
    this.trigger('gameControls:debug');
  },

  doEndTurn: function() {
    this.trigger('endTurn');
  },

  doStartGame: function() {
    var data = { 'gameStatus': GameStatusEnum.IN_PROGRESS };
    this.trigger('gameControls:gameStatus', { 'eventName': 'gameStatus',
                                              'data': data });
    this.updateControls(GameStatusEnum.IN_PROGRESS);
    this.disableFreeDrawBtn();
    this.toggleFreeDraw();
  },

  toggleFreeDraw: function() {
    var o = { 'eventName': 'toggleFreeDraw' };
    if (this.$('#freedraw').attr('checked')) {
      o.data = { 'freeDraw': true };
    }
    else {
      o.data = { 'freeDraw': false };
    }
    this.trigger('gameControls:freeDraw', o);
  },

  enableFreeDrawBtn: function () {
    this.freeDrawBtn.removeAttr('disabled');
  },

  disableFreeDrawBtn: function () {
    this.freeDrawBtn.removeAttr('checked');
    this.freeDrawBtn.attr('disabled', 'disabled');
  },

  updateControls: function(o) {
    if (o.gameStatus === GameStatusEnum.IN_PROGRESS) {
      this.startBtn.attr('disabled', 'disabled');
      this.endBtn.removeAttr('disabled');
    }
    else if (o.gameStatus === GameStatusEnum.FINISHED) {
      this.startBtn.removeAttr('disabled');
      this.endBtn.attr('disabled', 'disabled');
      this.freeDrawBtn.removeAttr('disabled');
    }
  },

  showControls: function() {
    this.$el.show();
  }
});
