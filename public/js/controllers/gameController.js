var gameSocket,
    chatSocket,

GameController = function() {
  var controller = {
    initialize: function() {
      var domainPrefix = debug ? 'http://localhost:8080' : 'http://warm-galaxy-5669.herokuapp.com';
      _.extend(this, Backbone.Events);
      _.bindAll(this,
                'setupViews',
                'setupGameState',
                'assignSocketHandler',
                'initEvents',
                'handleGameModel',
                'getCurrPlayer',
                'getPlayerById',
                'emitGameSocketEvent',
                'setupSocketEvents',
                'handleTurnOver');
      this.model = new GameModel();
      gameSocket = io.connect(domainPrefix + '/game');
      chatSocket = io.connect(domainPrefix + '/chat');
      this.gameSocket = gameSocket;

      // bind initGameModel here because we don't bind
      // the rest of the events until we get the game model
      // from the server.
      this.bind('initGameModel', this.handleGameModel);

      this.setupSocketEvents();
      return this;
    },

    setupViews: function() {
      // At this point, the models should be set up already as a result of the
      // fetch. We just need to populate the views with them now.

      // I decided I want to implement free-for-all first, since it will be
      // easier. If I have time, I'll come back to teams in the future.
      var freeDraw = this.gameStatus.get('freeDraw');
      this.playersView = new PlayersView({ el: $('.playerInfo'),
                                           collection: this.playersColl,
                                           getCurrPlayer: this.getCurrPlayer });

      /*
      this.teamsView    = new TeamsView({ el:            $('.teamsList'),
                                          collection:    this.teamsColl,
                                          getPlayerById: this.getPlayerById });
      */

      this.gameControls         = new GameControlsView({ el: $('#controls'),
                                                         freeDraw: freeDraw });
      this.gameStatusController = new GameStatusController({ model:         this.gameStatus,
                                                             getPlayerById: this.getPlayerById,
                                                             getCurrPlayer:  this.getCurrPlayer });
      this.gameIntro            = new GameIntroView({ el: $('#intro') });
      this.boardView            = new BoardView({ el: $('#board'),
                                                  freeDraw: freeDraw });
      _.extend(this.boardView, this.playerHelperFns);
    },

    setupGameState: function(gameData) {
      this.gameStatus  = new GameStatusModel(gameData.gameStatus);
      this.playersColl = new PlayersCollection(gameData.players);
      this.playersColl.userId = this.userId;
      this.currPlayer  = this.playersColl.get(this.userId);
      this.playerHelperFns = { 'currPlayer':    this.currPlayer,
                               'getPlayerById': this.getPlayerById };

      // teams = _.extend(gameData.teams, playerHelperFns),

      this.chatController = new ChatController(chatSocket);
      _.extend(this.chatController, this.playerHelperFns);

      // this.teamsColl      = new TeamCollection(teams);
      this.setupViews();
      this.initEvents();
    },

    // Decompose this function out to avoid variable hoisting.
    assignSocketHandler: function(eventName) {
      var _this = this;
      this.gameSocket.on(eventName, function(data) {
        _this.trigger(eventName, data);
      });
    },

    // SOCKET.IO EVENTS
    setupSocketEvents: function() {
      var i, len, eventName, _this = this,
          // a list of events to delegate to Backbone events
          eventsToDelegate = ['initGameModel',
                              'yourTurn',
                              'gameStatus',
                              'playerUpdate',
                              'newPlayer',
                              'playerDisconnect',
                              'playerName',
                              'newPoints',
                              'completedPath',
                              'toggleFreeDraw',
                              'wordToDraw',
                              'clearBoard',
                              'notifyCorrectGuess'];

      for (i = 0, len = eventsToDelegate.length; i<len; ++i) {
        eventName = new String(eventsToDelegate[i]);
        this.assignSocketHandler(eventsToDelegate[i]);
      }

      this.gameSocket.on('userId', function(id) {
        _this.userId = id;
      });
    },

    // BACKBONE EVENTS
    initEvents: function() {
      var _this = this;
      this.bind('yourTurn', function() {
        _this.toggleYourTurn(true);
      });

      this.bind('endTurn', function() {
        _this.gameSocket.emit('endTurn');
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
      this.bind('notifyCorrectGuess', this.boardView.doClear);
      // Communicate with chat this way so that we can display the name of the
      // player that left
      this.playersColl.bind('player:removedPlayer', this.chatController.handlePlayerDisconnect);
      this.playersColl.bind('player:changeName', this.chatController.handleNameChange);
      this.playersColl.bind('player:newLeader', this.chatController.handleNewLeader);
      this.playersColl.bind('player:promotedToLeader', this.gameControls.showControls);

      // TeamCollection Events
      //this.bind('newPlayer', this.teamsColl.addPlayer);

      // Board Events
      this.boardView.bind('boardView:sendPoints', this.emitGameSocketEvent);
      this.boardView.bind('boardView:completedPath', this.emitGameSocketEvent);
      this.bind('newPoints', this.boardView.handleNewPoints);
      this.bind('completedPath', this.boardView.handleCompletedPath);
      this.bind('toggleFreeDraw', this.boardView.handleFreeDraw);
      this.bind('newStrokeSub', this.boardView.handleNewStroke);
      this.bind('clearBoard', this.boardView.doClear);
      this.bind('wordToDraw', this.boardView.updateWordToDraw);

      // Game Status Events
      this.gameStatusController.bind('turnOver', this.handleTurnOver);
      this.gameStatusController.bind('turnOver', this.boardView.disable);
      this.gameStatusController.bind('turnOver', this.boardView.reset);
      this.gameStatusController.bind('setupArtistTurn', this.boardView.resetAndEnable);
      this.gameStatusController.bind('artistChange', this.boardView.reset);

      // Controller Events
      this.bind('gameStatus', this.gameStatusController.setGameStatus);
      this.bind('gameStatus', this.gameControls.updateControls);

      // Game Controls Events
      this.gameControls.bind('gameControls:clearBoard', this.emitGameSocketEvent);
      this.gameControls.bind('gameControls:clearBoard', this.boardView.doClear);
      this.gameControls.bind('gameControls:debug', this.debug);
      this.gameControls.bind('gameControls:gameStatus', this.emitGameSocketEvent);
      this.gameControls.bind('gameControls:gameStatus', this.gameStatusController.setGameStatus);
      this.gameControls.bind('gameControls:freeDraw', this.boardView.handleFreeDraw);
      this.gameControls.bind('gameControls:freeDraw', this.emitGameSocketEvent);
    },

    handleGameModel: function(data) {
      var players, teams;
      if (!data || !data.model) {
        console.log('[err] couldn\'t detect data');
        return;
      }
      this.userId = data.userId;
      this.setupGameState(data.model);
      this.boardView.handleInitPaths(data.initPaths);

      // set leader
      if (this.getCurrPlayer().get('isLeader')) {
        this.gameControls.showControls();
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

    /* emitGameSocketEvent
     * ==================
     * Generic handler for emitting a game event to Socket.IO.
     * Expects an object with two properties: eventName, the name
     * of the Socket.IO event to which to broadcast, and data,
     * the data to attach to the event.
     */
    emitGameSocketEvent: function (o) {
      if (o.eventName) {
        if (o.data) {
          this.gameSocket.emit(o.eventName, o.data);
        }
        else {
          this.gameSocket.emit(o.eventName);
        }
      }
    },

    handleTurnOver: function() {
      this.gameSocket.emit('turnOver');
    },

    debug: function() {
      this.gameSocket.emit('debug');
    }
  };

  return controller.initialize();
};

Backbone.sync = function(method, model) {
  console.log('syncing...');
  gameSocket.emit('sync', { 'model': model, 'method': method });
};
