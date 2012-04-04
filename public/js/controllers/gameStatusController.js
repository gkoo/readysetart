Pictionary.GameStatusController = function (o) {
  var controller = {
    initialize: function (o) {
      _.extend(this, Backbone.Events, o.playerFns);
      _.bindAll(this);

      this.model = o.model;
      this.view = new Pictionary.GameStatusView({ el: $('#gameStatus'),
                                       model: this.model,
                                       getPlayerById: this.getPlayerById });
      this.model.bind('change:gameStatus', this.handleGameStatus);
      this.model.bind('change:currArtist', this.changeArtist);

      this.setupEvents();

      if (this.model.get('turnStart')) {
        this.startPartialTimer();
      }
      return this;
    },

    setupEvents: function () {
      var eventMediator = Pictionary.getEventMediator();
      eventMediator.bind('changeGameStatus', this.saveGameStatus);
      eventMediator.bind('gameStatusUpdate', this.setGameStatus);
      eventMediator.bind('nextUp', this.clearTimer);
      eventMediator.bind('broadcastToggleFreeDraw', this.setFreeDraw);
      eventMediator.bind('stopGame', this.reset);
    },

    // saveGameStatus pushes state to the server.
    saveGameStatus: function (o) {
      this.model.save(o);
    },

    // setGameStatus only changes state locally.
    setGameStatus: function (o) {
      this.model.set(o);
    },

    // Handles timer for drawer.
    doTimerTick: function () {
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

    restartTimer: function (duration) {
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

    handleGameStatus: function (model, status) {
      var gameStatus = model.get('gameStatus');
      if (gameStatus === Pictionary.statusEnum.IN_PROGRESS
          && model.previous('gameStatus') !== Pictionary.statusEnum.IN_PROGRESS) {
        this.clearTimer();
      }
      else if (gameStatus === Pictionary.statusEnum.FINISHED) {
        this.clearTimer();
        Pictionary.getEventMediator().trigger('gameFinished');
      }
    },

    changeArtist: function (model, artistId) {
      if (artistId !== -1) {
        this.restartTimer();
      }
    },

    setFreeDraw: function (o) {
      // only allow set free draw if player is leader
      if (this.currPlayer.get('isLeader')) {
        this.model.save(o);
      }
    },

    reset: function () {
      this.clearTimer();
      this.changeArtist(null, -1);
      this.setGameStatus({ 'gameStatus': Pictionary.statusEnum.NOT_STARTED });
    }
  };
  return controller.initialize(o);
};
