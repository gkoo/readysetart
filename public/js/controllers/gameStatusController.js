var GameStatusController = function(o) {
  var controller = {
    initialize: function(o) {
      _.extend(this, Backbone.Events, o.playerFns);
      _.bindAll(this, 'setGameStatus',
                      'doTimerTick',
                      'restartTimer',
                      'startGame',
                      'handleGameStatus',
                      'changeArtist');

      this.model = o.model;
      this.view = new GameStatusView({ el: $('.gameInfo'),
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

      if (timeLeft < 0 && this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        // only leader triggers turn over.
        // TODO: change this so that turnOver event is generated
        // on the server side
        if (this.currPlayer.get('isLeader')) {
          this.trigger('turnOver');
        }
      }
      else {
        this.model.set({ 'timeLeft' : timeLeft });
      }
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

    startGame: function() {
      if (this.model.get('gameStatus') !== GameStatusEnum.IN_PROGRESS) {
        console.log('[warning] Game status is not IN_PROGRESS.');
      }

      this.restartTimer();
      this.view.render();
    },

    handleGameStatus: function(model, status) {
      if (model.get('gameStatus') === GameStatusEnum.IN_PROGRESS
          && model.previous('gameStatus') !== GameStatusEnum.IN_PROGRESS) {
        this.startGame();
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
