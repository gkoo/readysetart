var game     = require('./game'),
    wordBase = require('./wordbase/wordbase.js'),
    TURN_DURATION = 30000,
    TURN_BREAK_DURATION = 5000,
    gameStatusLib  = require('./public/js/models/gameStatusModel.js'),
    GameStatusEnum = gameStatusLib.GameStatusEnum,

Pictionary = function () {
  this.wordBase = wordBase;
  this.turn_duration = TURN_DURATION;

  // For each incoming path, store in userPaths keyed by socket.id
  // Once mouseup event comes in, move path from userPaths to allPaths
  // (only one path in userPaths[socketid] at a time)
  // On clearBoard event, remove userPaths and allPaths

  // Holds arrays of PaperJS Points, keyed by socket.id
  // Used primarily for freeDraw
  this.userPaths = {};

  this.userColors = {};

  // Array of arrays of PaperJS Points
  // (Array of Paths)
  this.allPaths = [];

  // Override
  // TODO: Need to distinguish between system messages and
  // user-generated messages
  this.setChat = function (chat) {
    this.chatController = chat;
    this.chatController.bind('newMessages', this.doCheckGuesses);
    return this;
  };

  this.doCheckGuesses = (function (o) {
    var messages     = o.messages,
        currArtistId = this.model.get('players').getCurrentArtist();

    if (!currArtistId) { return; }

    // filter out any "guesses" from the artist
    if (messages[0].sender !== currArtistId) {
      console.log(messages);
      correctGuess = this.wordBase.checkGuesses(messages);
      if (correctGuess) {
        // handle on chat side
        o.callback(correctGuess, o.socket);
        this.io.emit('notifyCorrectGuess');
        this.sendNextWord();
      }
    }
  }).bind(this);

  this.sendNextWord = (function () {
    var nextWord     = this.wordBase.getUnusedWord(),
        playersModel = this.model.get('players'),
        currArtistId = playersModel.getCurrentArtist();

    // Send currArtist the next word.
    this.io.socket(currArtistId).emit('wordToDraw', nextWord);
  }).bind(this);

  // Start the actual turn for the artist.
  this.startNextTurn = (function () {
    var model = this.model;
        currArtist = model.get('players').getCurrentArtist(),
        newStatus = { 'currArtist': currArtist };

    model.get('gameStatus').set(newStatus);
    this.io.emit('gameStatus', newStatus);
    this.sendNextWord();
    this.turnTimeout = setTimeout(this.startNextWarmUpAndTurn, this.turn_duration);
  }).bind(this);

  // Starts the next turn, buffered by 5 seconds to
  // allow the players to prepare.
  this.startNextWarmUpAndTurn = (function () {
    var players   = this.model.get('players'),
        nextArtist, newStatus;

    if (players.hasNextArtist()) {
      nextArtist = players.getNextArtist();
      newStatus = { 'currArtist': nextArtist };
      this.io.emit('nextUp', newStatus); // send the warm-up message
      setTimeout(this.startNextTurn, TURN_BREAK_DURATION);
    }
    else {
      // TODO: no more artists, signal end of round
      this.handleGameFinish();
    }
  }).bind(this);

  this.handleGameStart = function (o) {
    this.model.get('players').decideArtistOrder();

    // Clear cached paths
    this.userPaths = {};
    this.allPaths = [];

    this.io.emit('gameStatus', { 'gameStatus': GameStatusEnum.IN_PROGRESS });
    this.startNextWarmUpAndTurn();
  };

  this.handleGameFinish = (function (o) {
    var gameStatusModel = this.model.get('gameStatus'),
        newStatus = { 'gameStatus': GameStatusEnum.FINISHED };
    gameStatusModel.set(newStatus);
    this.io.emit('gameStatus', newStatus);
  }).bind(this);

  // Start or finish game.
  this.handleGameStatus = (function (o) {
    if (typeof o.gameStatus !== 'undefined') {
      if (o.gameStatus === GameStatusEnum.IN_PROGRESS) {
        this.handleGameStart(o);
      }
      else if (o.gameStatus === GameStatusEnum.FINISHED) {
        this.handleGameFinish(o);
      }
    }
  }).bind(this);

  this.handleDisconnect = (function (socket) {
    var id         = socket.id,
        players    = this.model.get('players'),
        player     = players.get(id),
        wasLeader  = player.get('isLeader'),
        currArtist = this.model.get('players').getCurrentArtist(),
        newLeader;

    // Remove player from players array
    players.remove(player);

    // If player was leader, reassign leader
    if (wasLeader && players.length) {
      newLeader = players.at(0);
      newLeader.set({ 'isLeader': true });
    }

    // If player was currArtist, begin new turn
    // TODO: Need to make sure there's not a race condition
    // where we start a new turn here, and then
    // the timer runs out and we try to start a new turn again.
    if (currArtist === id) {
      this.startNextTurn();
    }

    socket.broadcast.emit('playerDisconnect', { 'id': id, 'newLeaderId': newLeader ? newLeader.id : 0 });
  }).bind(this);

  // Create the data to pass to a newly connected player
  this.createInitPlayerInfo = (function (id) {
    var players   = this.model.get('players'),
        name      = 'Player ' + id,
        isLeader  = !players.length; // first player defaults to leader

    return { 'id':       id,
             'name':     name,
             'isLeader': isLeader };
  }).bind(this);

  this.getUserColor = function (socketid) {
    if (this.userColors[socketid]) {
      return this.userColors[socketid];
    }
    return '#000';
  };

  // Listen to Socket.io
  this.listen = function(io) {
    this.io = io.of('/game');

    this.io.on('connection', (function (socket) {
      var initInfo = this.createInitPlayerInfo(socket.id),
          players   = this.model.get('players');

      players.add(initInfo);

      socket.emit('initGameModel', { 'model': this.model,
                                     'initPaths': this.allPaths,
                                     'userId': socket.id });

      this.chatController.broadcastNewPlayer(initInfo);
      socket.broadcast.emit('newPlayer', initInfo); // Sends to everyone except for new user

      // LISTENERS

      socket.on('endTurn', function () {
        console.log('endTurn');
      });

      socket.on('gameStatus', (function(data) {
        if (socket.id !== players.getLeader().get('id')) {
          console.warn('tried to change game status but wasn\'t the leader');
          return;
        }
        this.handleGameStatus(data);
      }).bind(this));

      socket.on('setName', function (name) {
        socket.get('id', function (err, id) {
          var player;

          if (err) { console.log('[ERROR] ' + err); }

          else {
            player = players.get(id);
            player.set({ 'name': name });
            socket.json.broadcast.emit('playerName', {
              id: id,
              name: name
            });
          }
        });
      });

      // TODO: need to keep a timer on the server side
      socket.on('turnOver', this.startNextTurn);

      socket.on('disconnect', (function () {
        this.handleDisconnect(socket);
      }).bind(this));

      socket.on('sync', (function (data) {
        this.sync(data, socket);
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
        path = pathObj.points;

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
        gameStatusModel.set(data);
      }).bind(this));

      socket.on('clearBoard', (function() {
        socket.broadcast.emit('clearBoard');
        this.userPaths = {};
        this.allPaths = [];
      }).bind(this));

      socket.on('changeColor', (function (brushColor) {
        this.userColors[socket.id] = brushColor;
      }).bind(this));

      socket.on('debug', (function() {
        console.log(this.allPaths);
        console.log(this.userPaths);
      }).bind(this));
    }).bind(this));

    return this;
  };

  return this;
};

// Inherit from Game framework
Pictionary.prototype = new game.GameController({ turn_duration: TURN_DURATION });


module.exports = new Pictionary();
