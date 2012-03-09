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

  this.handleGameStart = function (o) {
    var players = this.model.get('players'),
        gameStatusModel = this.model.get('gameStatus'),
        turnEnd = (new Date()).getTime() + this.turn_duration,
        currArtistId,
        newStatus;

    // Player is authorized to start the game.
    players.decideArtistOrder();

    // Clear cached paths
    this.userPaths = {};
    this.allPaths = [];

    this.startNextTurn();
  };

  this.handleGameFinish = (function (o) {
    var gameStatusModel = this.model.get('gameStatus'),
        newStatus = { 'gameStatus': GameStatusEnum.FINISHED };
    gameStatusModel.set(newStatus);
    this.io.emit('gameStatus', newStatus);
  }).bind(this);

  this.startNextTurn = (function () {
    var players   = this.model.get('players'),
        gameStatusModel = this.model.get('gameStatus'),
        nextArtist, newStatus, nextWord;

    if (players.hasNextArtist()) {
      nextArtist = players.getNextArtist();
      newStatus = { 'currArtist': nextArtist };
      this.io.emit('nextUp', newStatus);
      setTimeout((function () {
        gameStatusModel.set(newStatus);
        this.io.emit('gameStatus', newStatus);
        this.sendNextWord();
      }).bind(this), TURN_BREAK_DURATION);
    }
    else {
      // TODO: no more artists, signal end of round
      this.handleGameFinish();
    }
  }).bind(this);

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

  // Listen to Socket.io
  this.listen = function(io) {
    this.io = io.of('/game');

    this.io.on('connection', (function (socket) {
      var players   = this.model.get('players'),
          yourId    = socket.id,
          yourName  = 'Player ' + yourId,
          isLeader  = !players.length, // first player defaults to leader
          //yourTeam  = this.computeUserTeam(yourId),
          initInfo,
          gameStatusModel = this.model.get('gameStatus');

      initInfo = { 'id':       yourId,
                   'name':     yourName,
                   'isLeader': isLeader };
                   //'team': yourTeam };

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

      socket.on('disconnect', function () {
        var player, wasLeader, newLeader, id = socket.id;

        player = players.get(id);
        wasLeader = player.get('isLeader');

        // Remove player from players array
        players.remove(player);

        if (wasLeader && players.length) {
          newLeader = players.at(0);
          newLeader.set({ 'isLeader': true });
        }

        // Remove player from any teams (s)he is on.
        // _this.model.get('teams').removePlayer(id);

        socket.broadcast.emit('playerDisconnect', { 'id': id,
                                                    'newLeaderId': newLeader ? newLeader.id : 0 });
        console.log(socket.id + ' disconnected');
      });

      socket.on('sync', (function (data) {
        this.sync(data, socket);
      }).bind(this));

      socket.on('newPoints', (function (data) {
        var path;
        socket.broadcast.emit('newPoints', { 'senderId': socket.id,
                                             'points': data });

        if (!this.userPaths[socket.id]) {
          this.userPaths[socket.id] = [];
        }

        path = this.userPaths[socket.id];
        this.userPaths[socket.id] = path.concat(data);
      }).bind(this));

      // Client has completed drawing a path.
      socket.on('completedPath', (function (o) {
        var path;
        socket.broadcast.emit('completedPath', { 'senderId': socket.id,
                                                 'points': o });
        path = this.userPaths[socket.id];
        if (path && path.length) {
          if (o && o.length) {
            path = path.concat(o);
          }
          this.allPaths.push(path);
        }
        else if (o && o.length) {
          this.allPaths.push(o);
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
