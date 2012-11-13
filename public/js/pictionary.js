var gameSocket,
    chatSocket,

Pictionary = function (room) {
  var domainPrefix = debug ? 'http://localhost:8080' : 'http://warm-galaxy-5669.herokuapp.com';
  _.extend(this, Backbone.Events);
  _.bindAll(this);
  gameSocket = io.connect(domainPrefix + '/game');
  chatSocket = io.connect(domainPrefix + '/chat');

  // join the room in both game and chat sockets
  gameSocket.emit('join', room);
  chatSocket.emit('join', room);
  this.gameSocket = gameSocket;
  this.model = new Pictionary.GameModel();
  this.chatController = new Pictionary.ChatController(chatSocket);

  // bind initGameModel here because we don't bind
  // the rest of the events until we get the game model
  // from the server.
  Pictionary.getEventMediator().bind('gameModel', this.handleGameModel);

  this.setupSocketEvents();

  this.model.fetch();
};

Pictionary.prototype = {
  // First, set up the models.
  // Then, set up the views.
  // Finally, set up the events.
  setupGameState: function (gameData) {
    this.gameStatus  = new Pictionary.GameStatusModel(gameData.gameStatus);
    this.playersColl = new Pictionary.PlayersCollection(gameData.players);
    this.playersColl.userId = this.userId;
    this.currPlayer  = this.playersColl.get(this.userId);
    this.playerHelperFns = { 'currPlayer':    this.currPlayer,
                             'getPlayerById': this.getPlayerById };

    _.extend(this.chatController, this.playerHelperFns);

    this.setupViews();
    this.initEvents();
  },

  setupViews: function () {
    // At this point, the models should be set up already as a result of the
    // fetch. We just need to populate the views with them now.

    // I decided I want to implement free-for-all first, since it will be
    // easier. If I have time, I'll come back to teams in the future.
    var freeDraw = this.gameStatus.get('freeDraw');
    this.playersView = new Pictionary.PlayersView({ el: $('#playerInfo'),
                                         collection: this.playersColl,
                                         getCurrPlayer: this.getCurrPlayer });

    this.gameControls         = new Pictionary.GameControlsView({ el: $('#controls'),
                                                       freeDraw: freeDraw });
    this.gameStatusController = new Pictionary.GameStatusController({ model:     this.gameStatus,
                                                                      playerFns: this.playerHelperFns });
    this.changeNameView       = new Pictionary.ChangeNameView({ el: $('#changeNameModal') });
    this.boardView            = new Pictionary.BoardView({ el: $('#board'),
                                                freeDraw: freeDraw });
    _.extend(this.boardView, this.playerHelperFns);
  },

  // Decompose this function out to avoid variable hoisting.
  assignSocketHandler: function (eventName) {
    this.gameSocket.on(eventName, function (data) {
      Pictionary.getEventMediator().trigger(eventName, data);
    });
  },

  // SOCKET.IO EVENTS
  setupSocketEvents: function () {
    var i, len, eventName, _this = this,
        // a list of events to delegate to Backbone events
        eventsToDelegate = ['gameStatusUpdate',
                            'playerUpdate',
                            'newPlayer',
                            'playerDisconnect',
                            'newPoints',
                            'completedPath',
                            'toggleFreeDraw',
                            'nextUp',
                            'wordToDraw',
                            'clearBoard',
                            'notifyCorrectGuess'];

    for (i = 0, len = eventsToDelegate.length; i<len; ++i) {
      this.assignSocketHandler(eventsToDelegate[i]);
    }
  },

  // BACKBONE EVENTS
  initEvents: function () {
    var _this = this,
        eventMediator = Pictionary.getEventMediator();

    // TODO: reintroduce the end turn button.
    //this.bind('endTurn', function () {
      //_this.gameSocket.emit('endTurn');
      //_this.toggleYourTurn(false);
    //});

    eventMediator.bind('setName', function (name) {
      var o = { id: _this.userId,
                name: name };
      _this.playersColl.setPlayerName(o);
    });

    // Board Events
    eventMediator.bind('sendBoardPoints', this.emitGameSocketEvent);
    eventMediator.bind('completedBoardPath', this.emitGameSocketEvent);
    eventMediator.bind('boardView:clear', this.emitGameSocketEvent);
    eventMediator.bind('boardView:changeColor', this.emitGameSocketEvent);

    // Game Status Events
    eventMediator.bind('gameFinished', this.boardView.handleGameFinished);
    eventMediator.bind('gameFinished', this.chatController.handleGameFinished);

    // Game Controls Events
    eventMediator.bind('gameControls:clearBoard', this.emitGameSocketEvent);
    eventMediator.bind('broadcastToggleFreeDraw', this.emitGameSocketEvent);
    eventMediator.bind('stopGame', this.emitGameSocketEvent);
    eventMediator.bind('debug', this.debug);
  },

  handleGameModel: function (data) {
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

  getPlayerById: function (id) {
    return this.playersColl.get(id);
  },

  getCurrPlayer: function () {
    return this.playersColl.get(this.userId);
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

  debug: function () {
    this.gameSocket.emit('debug');
  }
};

_.extend(Pictionary, {
  // =============
  // EventMediator
  // =============
  // Handles the facilitation of event communication
  // between various Pictionary objects. Is a singleton.
  EventMediator: function () {
    if (typeof this._eventMediator !== 'undefined') {
      return this._eventMediator;
    }
    _.extend(this, Backbone.Events);
  },

  // ================
  // getEventMediator
  // ================
  // Gets the EventMediator singleton from the Pictionary object.
  getEventMediator: function () {
    if (typeof this._eventMediator !== 'undefined') {
      return this._eventMediator;
    }
    else {
      this._eventMediator = new this.EventMediator();
      return this._eventMediator;
    }
  },

  statusEnum: {
    NOT_STARTED : 0,
    IN_PROGRESS : 1,
    FINISHED    : 2
  }
});

Backbone.sync = function (method, model, options) {
  var modelUrl = model.url().split('/'),
      socket = modelUrl[0],
      modelName = modelUrl[1],
      data = { 'modelName': modelName,
               'method': method };

  if (method === 'create' || method === 'update') {
    data.model = model.toJSON();
  }

  if (socket === 'game') { gameSocket.emit('sync', data); }
  else if (socket === 'chat') { chatSocket.emit('sync', data); }

  if (method === 'read') {
    gameSocket.once([method, modelName].join(':'), function (data) {
      if (modelName === 'gameModel') {
        Pictionary.getEventMediator().trigger('gameModel', data);
      }
    });
  }
};
