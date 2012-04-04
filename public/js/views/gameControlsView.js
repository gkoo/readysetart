Pictionary.GameControlsView = Backbone.View.extend({
  initialize: function (o) {
    var eventMediator = Pictionary.getEventMediator();
    _.extend(this, Backbone.Events);
    _.bindAll(this, 'doEndTurn',
                    'doStartGame',
                    'doStopGame',
                    'toggleFreeDraw',
                    'enableFreeDrawBtn',
                    'disableFreeDrawBtn',
                    'updateControls',
                    'showControls');
    this.$startBtn = this.$('.startGameBtn').removeAttr('disabled');
    this.$stopBtn = this.$('.stopGameBtn');
    //this.$endBtn = this.$('.endTurnBtn').attr('disabled', 'disabled');
    this.freeDrawBtn = this.$('#freedraw').removeAttr('disabled'); // TODO: why does Firefox persist this attr?
    if (o.freeDraw) {
      this.freeDrawBtn.attr('checked', 'checked');
    }
    else {
      this.freeDrawBtn.removeAttr('checked');
    }

    eventMediator.bind('promotedToLeader', this.showControls);
    eventMediator.bind('gameStatus', this.updateControls);
  },

  events: {
    'click .clearBtn': 'clearBoard',
    'click .debug': 'debug',
    'click .endTurnBtn': 'doEndTurn',
    'click .startGameBtn': 'doStartGame',
    'click .stopGameBtn': 'doStopGame',
    'change #freedraw': 'toggleFreeDraw'
  },

  clearBoard: function () {
    Pictionary.getEventMediator().trigger('gameControls:clearBoard', { 'eventName': 'clearBoard' });
  },

  debug: function () {
    Pictionary.getEventMediator().trigger('debug');
  },

  doEndTurn: function () {
    Pictionary.getEventMediator().trigger('endTurn');
  },

  doStartGame: function () {
    Pictionary.getEventMediator().trigger('changeGameStatus',
                                          { 'gameStatus': Pictionary.statusEnum.IN_PROGRESS });
    this.updateControls(Pictionary.statusEnum.IN_PROGRESS);
    this.disableFreeDrawBtn();
    // make sure free draw is turned off
    this.toggleFreeDraw();
  },

  doStopGame: function () {
    var data = { 'gameStatus': Pictionary.statusEnum.FINISHED };
    Pictionary.getEventMediator().trigger('stopGame',
                                          { 'eventName': 'gameStatus',
                                            'data': data });
    this.updateControls(Pictionary.statusEnum.FINISHED);
    this.enableFreeDrawBtn();
    // make sure free draw is turned off
    this.toggleFreeDraw();
  },

  // Determines state of free draw based on checkbox and
  // emits it to the other clients.
  toggleFreeDraw: function () {
    var data;
    if (this.$('#freedraw').attr('checked')) {
      data = { 'freeDrawEnabled': true };
    }
    else {
      data = { 'freeDrawEnabled': false };
    }
    Pictionary.getEventMediator().trigger('broadcastToggleFreeDraw', data);
  },

  enableFreeDrawBtn: function () {
    this.freeDrawBtn.removeAttr('disabled');
    this.freeDrawBtn.removeAttr('checked');
  },

  disableFreeDrawBtn: function () {
    this.freeDrawBtn.removeAttr('checked');
    this.freeDrawBtn.attr('disabled', 'disabled');
  },

  updateControls: function (gameStatus) {
    if (gameStatus === Pictionary.statusEnum.IN_PROGRESS) {
      this.$startBtn.attr('disabled', 'disabled');
      this.$stopBtn.removeAttr('disabled');
      //this.endBtn.removeAttr('disabled');
    }
    else if (gameStatus === Pictionary.statusEnum.FINISHED) {
      this.$startBtn.removeAttr('disabled');
      this.$stopBtn.attr('disabled', 'disabled');
      //this.endBtn.attr('disabled', 'disabled');
      this.freeDrawBtn.removeAttr('disabled');
    }
  },

  showControls: function () {
    this.$el.show();
  }
});
