var GameStatusController = function(o) {
  var controller = {
    initialize: function(o) {
      _.extend(this, Backbone.Events, o.playerFns);
      _.bindAll(this, 'setGameStatus',
                      'doTimerTick',
                      'clearTimer',
                      'restartTimer',
                      'startPartialTimer',
                      'handleGameStatus',
                      'changeArtist',
                      'reset');

      this.model = o.model;
      this.view = new GameStatusView({ el: $('#gameStatus'),
                                       model: this.model,
                                       getPlayerById: this.getPlayerById });
      this.model.bind('change:gameStatus', this.handleGameStatus);
      this.model.bind('change:gameStatus', this.view.renderStatus);
      this.model.bind('change:currArtist', this.changeArtist);
      this.model.bind('change:currArtist', this.view.renderCurrArtist);
      this.model.bind('change:timeLeft',   this.view.renderTimeLeft);

      if (this.model.get('turnStart')) {
        this.startPartialTimer();
      }
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

    restartTimer: function(duration) {
      var time, turnEnd, timeLeft,
          turnDuration = duration ? duration : this.model.get('turnDuration');

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

    // Start timer for a turn that was already in progress.
    // (Used for when a player connects to the game mid-turn.)
    startPartialTimer: function () {
      var turnStart = this.model.get('turnStart'),
          date, adjustedDate, timePassed, timeLeft;
      if (!turnStart) {
        return;
      }

      date = new Date();
      adjustedDate = date.getTime() + date.getTimezoneOffset();
      timePassed = adjustedDate - turnStart; // how much time has elapsed in the turn already.
      timeLeft = this.model.get('turnDuration') - timePassed;
      this.restartTimer(timeLeft);
    },

    handleGameStatus: function(model, status) {
      var gameStatus = model.get('gameStatus');
      if (gameStatus === GameStatusEnum.IN_PROGRESS
          && model.previous('gameStatus') !== GameStatusEnum.IN_PROGRESS) {
        this.clearTimer();
      }
      else if (gameStatus === GameStatusEnum.FINISHED) {
        this.clearTimer();
        this.trigger('gameFinished');
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
      if (artistId !== -1) {
        this.restartTimer();
      }
    },

    reset: function () {
      this.clearTimer();
      this.changeArtist(null, -1);
      this.setGameStatus({ 'gameStatus': GameStatusEnum.NOT_STARTED });
    }
  };
  return controller.initialize(o);
};
