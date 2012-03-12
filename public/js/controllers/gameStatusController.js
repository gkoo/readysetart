var GameStatusController = function(o) {
  var controller = {
    initialize: function(o) {
      _.extend(this, Backbone.Events, o.playerFns);
      _.bindAll(this, 'setGameStatus',
                      'doTimerTick',
                      'clearTimer',
                      'restartTimer',
                      'handleGameStatus',
                      'changeArtist');

      this.model = o.model;
      this.view = new GameStatusView({ el: $('#gameStatus'),
                                       model: this.model,
                                       getPlayerById: this.getPlayerById });
      this.model.bind('change:gameStatus', this.handleGameStatus);
      this.model.bind('change:gameStatus', this.view.renderStatus);
      this.model.bind('change:currArtist', this.changeArtist);
      this.model.bind('change:currArtist', this.view.renderCurrArtist);
      this.model.bind('change:timeLeft',   this.view.renderTimeLeft);
      return this;
    },

    setGameStatus: function(o) {
      this.model.set(o);
    },

    // Handles timer for drawer.
    doTimerTick: function() {
      var timeLeft = this.model.get('timeLeft') - 1;

      // End of turn
      if (timeLeft < 0 && this.timerInterval) {
        this.clearTimer();
        // TODO: want to do anything else here?
      }
      // Tick down one second
      else {
        this.model.set({ 'timeLeft' : timeLeft });
      }
    },

    // Stops the timer and sets timeLeft to zero.
    clearTimer: function () {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      this.model.set({ 'timeLeft' : 0 });
    },

    restartTimer: function() {
      var time, turnEnd, timeLeft,
          turnDuration = this.model.get('turnDuration');

      if (!turnDuration) {
        console.log('[err] No turn duration specified.');
        return;
      }
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
      }

      this.timerInterval = setInterval(this.doTimerTick, 1000);
      timeLeft = turnDuration/1000; // in seconds

      this.model.set({ 'timeLeft' : Math.floor(timeLeft) });
    },

    handleGameStatus: function(model, status) {
      var gameStatus = model.get('gameStatus');
      if (gameStatus === GameStatusEnum.IN_PROGRESS
          && model.previous('gameStatus') !== GameStatusEnum.IN_PROGRESS) {
        this.clearTimer();
      }
      else if (gameStatus === GameStatusEnum.FINISHED) {
        this.trigger('clearBoard');
      }
    },

    changeArtist: function(model, artistId) {
      if (artistId === this.currPlayer.id) {
        // It's current user's turn now. Enable board.
        this.trigger('setupArtistTurn');
      }
      else {
        this.trigger('artistChange');
      }
      this.restartTimer();
    }
  };
  return controller.initialize(o);
};
