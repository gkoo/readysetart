var _u       = require('underscore'),
    Backbone = require('backbone'),
    PlayersCollection = require('./player.js'),
    wordBase = require('./wordbase/wordbase.js'),
    TURN_DURATION = 120000,
    TURN_BREAK_DURATION = 5000,
    GameStatusEnum = {
      NOT_STARTED : 0,
      IN_PROGRESS : 1,
      FINISHED    : 2
    },

GameModel = Backbone.Model.extend({
  initialize: function () {
    var time = (new Date()).getTime(); // arbitrary id so that isNew
                                       // is false on client side when
                                       // saving.
    this.set({
      'id': 'lobby:game',
      'players': new PlayersCollection(),
      'gameStatus': new Backbone.Model({ 'turnDuration': TURN_DURATION,
                                         'warmupDuration': TURN_BREAK_DURATION,
                                         'id': 'lobby:gameStatus' })
    });
  }
}),

pictionary = {
  initialize: function () {
    _u.bindAll(this);
    _u.extend(this, Backbone.Events);
    this.models = {};

    return this;
  },

  // For each incoming path, store in userPaths keyed by socket.id
  // Once mouseup event comes in, move path from userPaths to allPaths
  // (only one path in userPaths[socketid] at a time)
  // On clearBoard event, remove userPaths and allPaths

  // Holds arrays of PaperJS Points, keyed by socket.id
  // Used primarily for freeDraw
  userPaths: {},

  // Array of arrays of PaperJS Points
  // (Array of Paths)
  allPaths: [],

  wordBase: wordBase,

  turn_duration: TURN_DURATION,

  turn_break_duration: TURN_BREAK_DURATION,

  userColors: {},

  // Override
  // TODO: Need to distinguish between system messages and
  // user-generated messages
  setChat: function (chat) {
    this.chatController = chat;
    this.chatController.bind('newMessage', this.doCheckGuesses);
    return this;
  },

  doCheckGuesses: function (o) {
    var messageModel = o.message,
        currArtistId = this.model.get('players').getCurrentArtist();

    if (!currArtistId) { return; }

    // filter out any "guesses" from the artist
    if (messageModel.sender !== currArtistId) {
      correctGuess = this.wordBase.checkGuesses(messageModel);
      if (correctGuess) {
        // handle on chat side
        o.callback(correctGuess, o.socket);
        this.io.emit('notifyCorrectGuess');
        this.sendNextWord();
      }
    }
  },

  sendNextWord: function () {
    var nextWord     = this.wordBase.getUnusedWord(),
        playersModel = this.model.get('players'),
        currArtistId = playersModel.getCurrentArtist();

    // Send currArtist the next word.
    this.io.socket(currArtistId).emit('wordToDraw', nextWord);
  },

  // Start the actual turn for the artist.
  startNextTurn: function () {
    var model = this.model;
        gameStatusModel = model.get('gameStatus'),
        currArtist = model.get('players').getCurrentArtist(),
        date = new Date(),
        turnStart = date.getTime() + date.getTimezoneOffset(),
        newStatus = { 'currArtist': currArtist,
                      'turnStart': turnStart };

    gameStatusModel.set(newStatus);
    this.io.emit('gameStatusUpdate', newStatus);
    this.sendNextWord();
    //this.turnInterval = setInterval(this.doTurnInterval, 1000);
    this.turnTimeout = setTimeout(this.startNextWarmUpAndTurn, this.turn_duration);
  },

  // Starts the next turn, buffered by 5 seconds to
  // allow the players to prepare.
  startNextWarmUpAndTurn: function () {
    var players   = this.model.get('players'),
        nextArtist;

    if (players.hasNextArtist()) {
      nextArtist = players.getNextArtist();
      this.io.emit('nextUp', { 'currArtist': nextArtist }); // send the warm-up message
      setTimeout(this.startNextTurn, this.turn_break_duration);
    }
    else {
      // No more artists, signal end of round.
      this.handleGameFinish();
    }
  },

  handleGameStart: function (o, socket) {
    this.model.get('players').decideArtistOrder();

    // Clear cached paths
    this.userPaths = {};
    this.allPaths = [];

    socket.broadcast.emit('gameStatusUpdate', { 'gameStatus': GameStatusEnum.IN_PROGRESS });
    this.startNextWarmUpAndTurn();
  },

  handleGameFinish: function (o) {
    var gameStatusModel = this.model.get('gameStatus'),
        newStatus = { 'gameStatus': GameStatusEnum.FINISHED,
                      'currArtist': -1,
                      'turnStart': 0 };
    gameStatusModel.set(newStatus);
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
    }
    this.io.emit('gameStatusUpdate', newStatus);
    this.clearCachedPaths();
  },

  // Start or finish game.
  handleGameStatus: function (model, socket) {
    var gameStatusModel = this.model.get('gameStatus');

    if (typeof model.gameStatus !== 'undefined' &&
        model.gameStatus !== gameStatusModel.get('gameStatus')) {
      gameStatusModel.set({ 'gameStatus': model.gameStatus });
      if (model.gameStatus === GameStatusEnum.IN_PROGRESS) {
        this.handleGameStart(model, socket);
      }
      else if (model.gameStatus === GameStatusEnum.FINISHED) {
        this.handleGameFinish(model);
      }
    }
    if (typeof model.freeDrawEnabled !== undefined &&
        gameStatusModel.get('freeDrawEnabled') !== model.freeDrawEnabled) {
      // Free draw value has been changed. Update everyone.
      gameStatusModel.set({ 'freeDrawEnabled': model.freeDrawEnabled });
      socket.broadcast.emit( 'toggleFreeDraw', { freeDrawEnabled: model.freeDrawEnabled });
    }
  },

  handleDisconnect: function (socket) {
    var id         = socket.id,
        model      = this.models[socket.joinedRoom],
        players, player, wasLeader, currArtist, newLeader;

    if (!model) { return; }
    players    = model.get('players'),
    player     = players.get(id),
    wasLeader  = player.get('isLeader'),
    currArtist = model.get('players').getCurrentArtist(),
    newLeader;

    // Remove player from players array
    players.remove(player);

    if (!players.length) {
      // No one is left in the room. =(
      if (this.turnTimeout) {
        clearTimeout(this.turnTimeout);
      }
      this.handleGameFinish(socket.joinedRoom);
      return;
    }

    // If player was leader, reassign leader
    if (wasLeader && players.length) {
      newLeader = players.at(0);
      newLeader.set({ 'isLeader': true });
    }

    socket.broadcast.emit('playerDisconnect', { 'id': id, 'newLeaderId': newLeader ? newLeader.id : 0 });

    // If player was currArtist, begin new turn
    if (currArtist === id && this.model.get('gameStatus').get('gameStatus') === GameStatusEnum.IN_PROGRESS) {
      // Prevent race condition by clearing original timeout.
      if (this.turnTimeout) {
        clearTimeout(this.turnTimeout);
      }
      this.startNextWarmUpAndTurn();
    }
  },

  // Create the data to pass to a newly connected player
  createInitPlayerInfo: function (id, room) {
    var model     = this.models[room],
        players   = model.get('players'),
        name      = 'Player ' + id,
        isLeader  = !players.length; // first player defaults to leader

    return { 'id':       id,
             'name':     name,
             'isLeader': isLeader };
  },

  getUserColor: function (socketid) {
    if (this.userColors[socketid]) {
      return this.userColors[socketid];
    }
    return '#000';
  },

  clearCachedPaths: function () {
    this.userPaths = {};
    this.allPaths = [];
  },

  create: function (data, socket) {
    switch (data.modelName) {
      case 'messageModel':
        socket.emit(['read', data.modelName].join(':'),
                    { 'model': this.model,
                      'initPaths': this.allPaths,
                      'userId': socket.id });
        break;
      default:
        console.log('[WARNING] Did not recognize model name: ' + data.modelName);
    }
  },

  read: function (data, socket) {
    switch (data.modelName) {
      case 'gameModel':
        socket.emit(['read', data.modelName].join(':'),
                    { 'model': this.models[socket.joinedRoom],
                      'initPaths': this.allPaths,
                      'userId': socket.id });
        break;
      default:
        console.log('[WARNING] Did not recognize model name: ' + data.modelName);
    }
  },

  update: function (data, socket) {
    var sendingPlayer = this.model.get('players').get(socket.id),
        player,
        modelInfo = data.modelName,
        modelName = modelInfo[0];

    if (data.modelName === 'players') {
      player = this.model.get('players').get(data.model.id);
      player.set(data.model);
      socket.broadcast.emit('playerUpdate', data.model);
    }
    else if (data.modelName === 'gameStatus') {
      // Only allow leader to make changes to game status.
      if (sendingPlayer.get('isLeader')) {
        this.handleGameStatus(data.model, socket);
      }
    }
  },

  // Listen to Socket.io
  listen: function(io) {
    this.io = io.of('/game');

    this.io.on('connection', (function (socket) {
      console.log('[PICT] client connected');
      // Don't send init info until the user has joined a room.
      // TODO: create rooms for players, chat messages, etc
      socket.on('join', (function(room) {
        var oldRoom, initInfo, players, roomGameModel;
        //console.log('\n\t[PICT] client joined room: ' + room);

        if (typeof room !== "string") {
          return;
        }

        // Make sure the socket is only in one room at a time.
        if (typeof socket.joinedRoom !== 'undefined') {
          // socket is joining room it's already in, so return.
          if (room === socket.joinedRoom) { return; }

          socket.leave(socket.joinedRoom);
        }

        socket.join(room);
        socket.joinedRoom = room; // store for easy look up later

        // Create game model for this room if it doesn't exist already.
        roomGameModel = this.models[room];
        if (!roomGameModel) {
          roomGameModel = new GameModel();
          this.models[room] = roomGameModel;
        }

        initInfo = this.createInitPlayerInfo(socket.id, room),
        players  = roomGameModel.get('players');

        players.add(initInfo);

        this.chatController.broadcastNewPlayer(initInfo, room);
        socket.broadcast.to(room).json.emit('newPlayer', initInfo); // Sends to everyone except for new user
      }).bind(this));

      socket.on('setName', function (name) {
        if (typeof name === 'string') {
          var player, id = socket.id;

          if (err) { console.log('[ERROR] ' + err); }

          else {
            player = players.get(id);
            player.set({ 'name': name });
            socket.json.broadcast.emit('playerUpdate', {
              id: id,
              name: name
            });
          }
        }
      });

      socket.on('disconnect', (function () {
        this.handleDisconnect(socket);
      }).bind(this));

      socket.on('newPoints', (function (data) {
        var path, userColor = this.getUserColor(socket.id);

        socket.broadcast.emit('newPoints', { 'senderId': socket.id,
                                             'points': data,
                                             'color': userColor });

        if (!this.userPaths[socket.id]) {
          this.userPaths[socket.id] = { 'color': userColor,
                                        'points': [] };
        }

        path = this.userPaths[socket.id].points;
        this.userPaths[socket.id].points = path.concat(data);
      }).bind(this));

      // Client has completed drawing a path.
      socket.on('completedPath', (function (o) {
        var pathObj, path;
        socket.broadcast.emit('completedPath', { 'senderId': socket.id,
                                                 'points': o });
        pathObj = this.userPaths[socket.id];
        path = pathObj ? pathObj.points : null;

        if (path && path.length) {
          if (o && o.length) {
            pathObj.points = path.concat(o);
          }
          this.allPaths.push(pathObj);
        }
        else if (o && o.length) {
          this.allPaths.push({ 'senderId': socket.id,
                               'color': this.getUserColor(socket.id),
                               'points': o });
        }
        this.userPaths[socket.id] = null;
      }).bind(this));

      socket.on('toggleFreeDraw', (function (data) {
        var gameStatusModel;
        // only leader is allowed to toggle free draw.
        if (socket.id === players.getLeader().get('id')) {
          socket.broadcast.emit('toggleFreeDraw', data);
        }
        gameStatusModel = this.model.get('gameStatus');
        if (gameStatusModel.get('gameStatus') !== GameStatusEnum.IN_PROGRESS) {
          gameStatusModel.set(data);
        }
      }).bind(this));

      socket.on('clearBoard', (function () {
        socket.broadcast.emit('clearBoard');
        this.clearCachedPaths();
      }).bind(this));

      socket.on('changeColor', (function (brushColor) {
        this.userColors[socket.id] = brushColor;
      }).bind(this));

      socket.on('debug', (function () {
        console.log(this.allPaths);
        //console.log(this.userPaths);
      }).bind(this));

      // ======================
      // Backbone.sync handler
      // ======================
      socket.on('sync', (function (data) {
        this[data.method](data, socket);
      }).bind(this));
    }).bind(this));

    return this;
  }
};


module.exports = pictionary.initialize();
