// NOTE: maybe i should decompose out the syncing.
//
// Plan for picking drawer. At time of game start, pre-calculate
// schedule of drawers. This way, if people come and go during
// the middle of the game, they can still participate and guess,
// but it won't mess up who gets to draw, etc.

var socketio = require('socket.io'),
    _u       = require('underscore'),
    pict     = require('./pictionary.js'),
    chatLib  = require('./chat.js'),
    Backbone = require('backbone'),

    //playerLib      = require('./public/js/models/playerModel.js'),
    playerLib      = require('./player.js'),
    //teamLib      = require('./public/js/models/teamModel.js'),
    gameStatusLib  = require('./public/js/models/gameStatusModel.js'),
    GameStatusEnum = gameStatusLib.GameStatusEnum,
    TURN_DURATION  = 10000, // 10 seconds

GameModel = Backbone.Model.extend({
  initialize: function() {
    this.set({ 'players':      new playerLib.PlayersCollection(),
               'chat':         new chatLib.ChatModel(),
               'gameStatus':   new gameStatusLib.GameStatusModel(),
               'turnDuration': TURN_DURATION
             });
  }
}),

GameController = function() {
  var controller = {
    initialize: function() {
      var chatModel, _this = this;
      _u.bindAll(this,
                 'sendNextWord',
                 'sync',
                 'read',
                 'update');

      this.model = new GameModel();

      chatModel = this.model.get('chat');
      chatModel.bind('newMessages', function(messages) {
        var currArtistId = _this.model.get('players').getCurrentArtist();
        if (!currArtistId) { return; }
        if (messages[0].sender !== currArtistId) {
          // filter out any "guesses" from the artist
          pict.wordBase.checkGuesses(messages);
        }
      });
      return this;
    },

    // just proxy to socket.io
    listen: function(app) {
      var _this = this,
          chat;

      io = socketio.listen(app);
      io.set('transports', ['htmlfile', 'xhr-polling', 'jsonp-polling']);
      io.of('/game').on('connection', function(socket) {

        var players   = _this.model.get('players'),
            yourId    = socket.id,
            yourName  = 'Anonymous',
            isLeader  = false,
            //yourTeam  = _this.computeUserTeam(yourId),
            initInfo,
            gameStatusModel = _this.model.get('gameStatus');

        initInfo= { 'id':          yourId,
                    'name':        yourName,
                    'isLeader':    !players.length };
                    //'team': yourTeam };

        players.add(initInfo);

        socket.emit('userId', yourId);

        // Sends to everyone except for new user
        socket.broadcast.emit('newPlayer', initInfo);

        // LISTENERS

        socket.on('endTurn', function () {
          console.log('endTurn');
        });

        socket.on('gameStatus', function (o) {
          var leader = players.getLeader(),
              status = o.gameStatus,
              date   = new Date(),
              currArtistId,
              gameStatusModel,
              newStatus;

          if (socket.id === leader.get('id')) {
            // Player is authorized to start the game.

            players.decideArtistOrder();
            currArtistId = players.getCurrentArtist();
            turnEnd = date.getTime() + TURN_DURATION;

            _this.model.set({ 'turnEnd': turnEnd });
            gameStatusModel = _this.model.get('gameStatus');
            newStatus = { 'gameStatus': status,
                          'currArtist': currArtistId,
                          'turnEnd':    turnEnd };
            gameStatusModel.set(newStatus);
            socket.broadcast.emit('gameStatus', newStatus);
            socket.emit('gameStatus', newStatus);
            _this.sendNextWord();
          }
          else {
            console.warn('tried to change game status but wasn\'t the leader');
          }
        });

        socket.on('setName', function(name) {
          socket.get('id', function(err, id) {
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

        socket.on('printPlayers', function() {
          console.log(_this.model.get('players').toJSON());
        });

        socket.on('disconnect', function(data) {
          var i, len, player, id = socket.id;

          // Remove player from players array
          players.remove(players.get(id));

          // Remove player from any teams (s)he is on.
          // _this.model.get('teams').removePlayer(id);

          socket.broadcast.emit('playerDisconnect', id);
          console.log(socket.id + ' disconnected');
        });

        socket.on('sync', function(data) {
          _this.sync(data, socket);
        });

        pict.wordBase.bind('correctGuess', function(o) {
          socket.emit('correctGuess', o);
          _this.sendNextWord();
        });

        pict.listen(socket);

      });

      chat = this.model.get('chat');
      chat.listen(io);
    },

    sendNextWord: function() {
      var nextWord     = pict.wordBase.getUnusedWord(),
          playersModel = this.model.get('players'),
          currArtistId = playersModel.getCurrentArtist();

      // Send currArtist the first word.
      io.of('/game').socket(currArtistId).emit('wordToDraw', nextWord);
    },

    endPlayerTurn: function() {
    },

    sync: function(data, socket) {
      if (data.method === 'read') {
        this.read(data, socket);
      }
      if (data.method === 'update') {
        this.update(data, socket);
      }
    },

    read: function(data, socket) {
      if (data.model.type === 'game') {
        socket.emit('readResponse', { 'type': 'game',
                                      'model': this.model });
      }
    },

    update: function(data, socket) {
      var player;
      if (data.model.type === 'player') {
        player = this.model.get('players').get(data.model.id);
        player.set(data.model);
        console.log('broadcasting playerUpdate');
        socket.broadcast.emit('playerUpdate', data.model);
      }
    },

    /*
    computeUserTeam: function(userId) {
      var teams = this.model.get('teams'),
          minPlayerTeam = teams.getMinPlayerTeam(), // team with the fewest players
          players;

      players = minPlayerTeam.get('players');
      players.push(userId);
      minPlayerTeam.set({ 'players': players });
      console.log('added player ' + userId + ' to team ' + minPlayerTeam.id);
      return minPlayerTeam.id;
    },
    */

    updatePlayer: function(o, res) {
      var player;
      try {
        player = this.model.get('players').get(o.id);
        player.set(o);
        res.send({ status: 'success' }, 200);
      }
      catch (e) {
        console.log(e);
        res.send({ status: 'failure' }, 500);
      }
    }
  }
  return controller.initialize();
};

module.exports = new GameController();
