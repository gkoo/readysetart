var GameStatusController = function(o) {
  var controller = {
    initialize: function(o) {
      this.model = o.model;
      this.view = new GameStatusView({ el: $('.gameInfo'),
                                       model: this.model,
                                       getPlayerById: o.getPlayerById });
      _.bindAll(this, 'setGameStatus',
                      'doTimerTick',
                      'handleGameStatus',
                      'startGame');
      _.extend(this, Backbone.Events);
      this.model.bind('change:gameStatus', this.view.renderStatus);
      this.model.bind('change:currArtist', this.view.renderCurrArtist);
      this.model.bind('change:timeLeft',   this.view.renderTimeLeft);
      return this;
    },

    setGameStatus: function(o) {
      try {
        this.model.set(o);
        this.handleGameStatus();
      }
      catch(e) {
        console.log(e);
      }
    },

    doTimerTick: function() {
      var time = (new Date()).getTime(),
          timeLeft = this.model.get('timeLeft') - 1;

      if (timeLeft < 0 && this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.trigger('turnOver');
      }
      else {
        this.model.set({ 'timeLeft' : timeLeft });
      }
    },

    startGame: function() {
      var turnDuration = this.model.get('turnDuration'),
          time,
          timeLeft;

      if (!turnDuration) {
        console.log('[err] No turn duration specified.');
        return;
      }
      if (this.model.get('gameStatus') !== GameStatusEnum.IN_PROGRESS) {
        console.log('[warning] Game status is not IN_PROGRESS.');
      }

      this.model.set({ 'turnEnd': (new Date()).getTime() + turnDuration });

      if (!this.timerInterval) {
        this.timerInterval = setInterval(this.doTimerTick, 1000);
        time = (new Date()).getTime();
        timeLeft = (this.model.get('turnEnd') - time)/1000; // in seconds
        this.model.set({ 'timeLeft' : Math.floor(timeLeft) });
      }
      else {
        console.log('[warning] timerInterval already exists...');
      }
      this.view.render();
      this.view.renderTimeLeft();
    },

    handleGameStatus: function(model, status) {
      // need to set interval here.
      if (this.model.get('gameStatus') === GameStatusEnum.IN_PROGRESS) {
        console.log('starting game');
        this.startGame();
      }
    }
  };
  return controller.initialize(o);
};
