var game     = require('./game'),
    wordBase = require('./wordbase/wordbase.js'),
    TURN_DURATION = 30000,
    gameStatusLib  = require('./public/js/models/gameStatusModel.js'),
    GameStatusEnum = gameStatusLib.GameStatusEnum,

Pictionary = function () {
  this.wordBase = wordBase;
  this.turn_duration = TURN_DURATION;

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
        // TODO: handle on game side
        // broadcast to gameSocket
        this.sendNextWord();
      }
    }
  }).bind(this);

  this.sendNextWord = (function () {
    var nextWord     = this.wordBase.getUnusedWord(),
        playersModel = this.model.get('players'),
        currArtistId = playersModel.getCurrentArtist();

    // Send currArtist the first word.
    this.io.socket(currArtistId).emit('wordToDraw', nextWord);
  }).bind(this);

  this.handleGameStart = function (o) {
    var players = this.model.get('players'),
        gameStatusModel = this.model.get('gameStatus'),
        leader  = players.getLeader(),
        status  = o.gameStatus,
        date    = new Date(),
        turnEnd = (new Date()).getTime() + this.turn_duration,
        currArtistId,
        newStatus;

    // Player is authorized to start the game.
    players.decideArtistOrder();
    currArtistId = players.getCurrentArtist();

    newStatus = { 'gameStatus': status, // set new status for all players
                  'currArtist': currArtistId,
                  'turnEnd': turnEnd };

    gameStatusModel.set(newStatus);
    this.io.emit('gameStatus', newStatus);
    this.sendNextWord();
  };

  this.handleGameStatus = (function (o) {
    if (typeof o.gameStatus !== 'undefined') {
      if (o.gameStatus === GameStatusEnum.IN_PROGRESS) {
        this.handleGameStart(o);
      }
      else if (o.gameStatus === GameStatusEnum.FINISHED) {
        //this.handleGameFinish(o);
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

      console.log('\t[PICT] Player ' + yourId + ' connected to game');
      initInfo = { 'id':       yourId,
                   'name':     yourName,
                   'isLeader': isLeader };
                   //'team': yourTeam };

      players.add(initInfo);

      socket.emit('initGameModel', { 'type': 'game',
                                     'model': this.model,
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

      socket.on('printPlayers', (function () {
        console.log(this.model.get('players').toJSON());
      }).bind(this));

      socket.on('turnOver', (function () {
        var nextArtist, newStatus, nextWord;
        if (players.hasNextArtist()) {
          nextArtist = players.getNextArtist();
          newStatus = { 'currArtist': nextArtist };
          socket.broadcast.emit('gameStatus', newStatus);
          socket.emit('gameStatus', newStatus);
          gameStatusModel.set(newStatus);
          this.sendNextWord();
        }
        else {
          // TODO: no more artists, signal end of round
        }
      }).bind(this));

      socket.on('disconnect', function (data) {
        var i, len, player, id = socket.id;

        // Remove player from players array
        players.remove(players.get(id));

        // Remove player from any teams (s)he is on.
        // _this.model.get('teams').removePlayer(id);

        socket.broadcast.emit('playerDisconnect', id);
        console.log(socket.id + ' disconnected');
      });

      socket.on('sync', (function (data) {
        this.sync(data, socket);
      }).bind(this));

      socket.on('debug', function () {
      });

      socket.on('newStrokePub', function(segment) {
        console.log('\n\n\nNewStrokePub');
        console.log(segment);
        socket.broadcast.emit('newStrokeSub', segment);
      });

      socket.on('clearBoard', function() {
        socket.broadcast.emit('clearBoard');
      });
    }).bind(this));

    return this;
  };

  return this;
};

// Inherit from Game framework
Pictionary.prototype = new game.GameController({ turn_duration: TURN_DURATION });


module.exports = new Pictionary();
