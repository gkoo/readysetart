var GameController = function(socket) {
  var controller = {
    initialize: function(socket) {
      _.extend(this, Backbone.Events);
      _.bindAll(this,
                'setupViews',
                'setupGameState',
                'initEvents',
                'readResponse',
                'getCurrPlayer',
                'getPlayerById',
                'setupSocketEvents');
      this.model = new GameModel();
      this.setupSocketEvents();
      return this;
    },

    setupViews: function() {
      // At this point, the models should be set up already as a result of the
      // fetch. We just need to populate the views with them now.
      try {
        // I decided I want to implement free-for-all first, since it will be
        // easier. If I have time, I'll come back to teams in the future.
        this.playersView = new PlayersView({ el: $('.playerInfo'),
                                             collection: this.playersColl,
                                             getCurrPlayer: this.getCurrPlayer });

        /*
        this.teamsView    = new TeamsView({ el:            $('.teamsList'),
                                            collection:    this.teamsColl,
                                            getPlayerById: this.getPlayerById });
        */
      } catch (e) {
        console.log(e);
      }

      this.gameControls   = new GameControlsView({ el: $('.controls') });
      this.gameStatusView = new GameStatusView({ el: $('.gameInfo'),
                                                 model: this.gameStatus,
                                                 getPlayerById: this.getPlayerById });
      this.gameIntro      = new GameIntroView({ el: $('#intro') });
      this.boardModel     = new BoardModel({ 'boardEnabled': this.getCurrPlayer().get('isLeader') });
      this.boardView      = new BoardView({ el: $('.board'),
                                            model: this.boardModel });

      this.boardModel.getCurrPlayer = this.getCurrPlayer;
    },

    setupGameState: function(gameData) {
      var playerHelperFns, teams, chat;

      this.gameStatus  = new GameStatusModel(gameData.gameStatus);
      this.playersColl = new PlayersCollection(gameData.players);
      this.currPlayer  = this.playersColl.get(this.userId);

      playerHelperFns  = { 'currPlayer': this.currPlayer,
                           'getPlayerById': this.getPlayerById };
      // teams = _.extend(gameData.teams, playerHelperFns),
      chat = _.extend(gameData.chat, playerHelperFns);

      // this.teamsColl      = new TeamCollection(teams);
      this.chatController = new ChatController(chat);
      this.setupViews();
      this.initEvents();
    },

    // SOCKET.IO EVENTS
    setupSocketEvents: function() {
      var _this = this;

      socket.on('connect', function() {
        _this.model.fetch();
      });

      socket.on('disconnect', function() {
        console.log('disconnect');
        //var name = prompt('What is your name?');
      });

      socket.on('readResponse', this.readResponse);

      socket.on('userId', function(id) {
        _this.userId = id;
      });

      socket.on('yourTurn', function () {
        _this.trigger('yourTurn');
      });

      socket.on('gameStatus', function (o) {
        _this.trigger('gameStatus', o);
      });

      socket.on('playerUpdate', function(player) {
        _this.trigger('playerUpdate', player);
      });

      socket.on('newPlayer', function(o) {
        _this.trigger('newPlayer', o);
      });

      socket.on('playerDisconnect', function(id) {
        _this.trigger('playerDisconnect', id);
      });

      socket.on('playerName', function(o) {
        _this.trigger('playerName', o);
      });

      socket.on('newStrokeSub', function(o) {
        _this.trigger('newStrokeSub', o);
      });

      socket.on('wordToDraw', function(word) {
        _this.trigger('wordToDraw', word);
      });

      socket.on('clearBoard', function() {
        _this.trigger('clearBoard');
      });

      socket.on('correctGuess', function(o) {
        _this.trigger('correctGuess', o);
      });
    },

    // BACKBONE EVENTS
    initEvents: function() {
      var _this = this;
      this.bind('yourTurn', function() {
        _this.toggleYourTurn(true);
      });

      this.bind('endTurn', function() {
        socket.emit('endTurn');
        _this.toggleYourTurn(false);
      });

      this.gameIntro.bind('setName', function(name) {
        var o = { id: _this.userId,
                  name: name };
        _this.playersColl.setPlayerName(o);
      });

      // PlayerCollection Events
      this.bind('newPlayer',    this.playersColl.handleNewPlayer);
      this.bind('playerUpdate', this.playersColl.playerUpdate);
      this.bind('playerName',   this.playersColl.setPlayerName);
      this.bind('playerDisconnect', this.playersColl.playerDisconnect);

      // TeamCollection Events
      //this.bind('newPlayer', this.teamsColl.addPlayer);

      // Board Events
      this.boardView.bind('newStrokePub', this.broadcastStroke);
      this.boardView.bind('clearBoard', this.broadcastClearBoard);
      this.bind('newStrokeSub', this.boardView.handleNewStroke);
      this.bind('clearBoard', this.boardView.doClear);
      this.bind('wordToDraw', this.boardView.updateWordToDraw);

      // Controller Events
      this.bind('gameStatus', this.gameStatus.handleGameStatus);
      this.bind('gameStatus', this.gameControls.updateControls);
      this.bind('correctGuess', this.notifyCorrectGuess);

      // Game Control Events
      this.gameControls.bind('gameStatus', this.gameStatus.handleGameStatus);
    },

    readResponse: function(data) {
      var players, teams;
      console.log('handling readResponse');
      if (!data || !data.type || !data.model) {
        console.log('[err] couldn\'t detect data');
        return;
      }
      if (data.type === 'game') {
        try {
          this.setupGameState(data.model);

          // set leader
          if (this.getCurrPlayer().get('isLeader')) {
            this.gameControls.showControls();
          }
        }
        catch (e) {
          console.log(e);
        }
      }
    },

    getPlayerById: function(id) {
      return this.playersColl.get(id);
    },

    getCurrPlayer: function() {
      return this.playersColl.get(this.userId);
    },

    toggleYourTurn: function(state) {
      console.log('toggling turn: ' + state);
      if (typeof state !== 'undefined') {
        state = true;
      }

      if (state) {
        this.statusElem.text('It is your turn');
        this.endTurnElem.removeAttr('disabled');
      }
      else {
        this.statusElem.text('It is not your turn');
        this.endTurnElem.attr('disabled', 'disabled');
      }
    },

    broadcastStroke: function(segments) {
      socket.emit('newStrokePub', segments);
    },

    broadcastClearBoard: function(segments) {
      socket.emit('clearBoard');
    },

    notifyCorrectGuess: function(o) {
      alert([o.name, 'guessed correctly:', o.message].join(' '));
    }
  };
  return controller.initialize(socket);
};
