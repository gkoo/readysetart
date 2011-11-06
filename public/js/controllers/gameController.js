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
                'setupSocketEvents',
                'notifyCorrectGuess',
                'handleTurnOver');
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

        this.gameControls         = new GameControlsView({ el: $('.controls') });
        this.gameStatusController = new GameStatusController({ model:         this.gameStatus,
                                                               getPlayerById: this.getPlayerById,
                                                               getCurrPlayer:  this.getCurrPlayer });
        this.gameIntro            = new GameIntroView({ el: $('#intro') });
        this.boardView            = new BoardView({ el: $('.board') });
      } catch (e) {
        console.log(e);
      }
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

      socket.on('notifyCorrectGuess', function(o) {
        _this.trigger('notifyCorrectGuess', o);
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
      this.boardView.bind('debug', this.debug);
      this.gameStatusController.bind('turnOver', this.boardView.reset);
      this.bind('newStrokeSub', this.boardView.handleNewStroke);
      this.bind('clearBoard', this.boardView.doClear);
      this.bind('wordToDraw', this.boardView.updateWordToDraw);

      // Game Status Events
      this.gameStatusController.bind('turnOver', this.handleTurnOver);
      this.gameStatusController.bind('turnOver', this.boardView.disable);
      this.gameStatusController.bind('setupArtistTurn', this.boardView.resetAndEnable);
      this.gameStatusController.bind('artistChange', this.boardView.reset);

      // Controller Events
      this.bind('gameStatus', this.gameStatusController.setGameStatus);
      this.bind('gameStatus', this.gameControls.updateControls);
      this.bind('notifyCorrectGuess', this.notifyCorrectGuess);

      // Game Control Events
      this.gameControls.bind('gameStatus', this.gameStatusController.setGameStatus);
    },

    readResponse: function(data) {
      var players, teams;
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
      this.chatController.notifyCorrectGuess(o);
    },

    handleTurnOver: function() {
      socket.emit('turnOver');
    },

    debug: function() {
      socket.emit('debug');
    }
  };
  return controller.initialize(socket);
};
