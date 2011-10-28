// TODO: teams
// NOTE: maybe i should decompose out the syncing.

var io       = require('socket.io'),
    _u       = require('underscore'),
    pict     = require('./pictionary.js'),
    Backbone = require('backbone'),

    playerLib         = require('./public/js/player.js'),
    teamLib           = require('./public/js/team.js'),
    statusLib         = require('./public/js/gameStatus.js').GameStatus,
    gameStatus        = new statusLib();

GameModel = Backbone.Model.extend({
  initialize: function() {
    var teamCollection = new teamLib.TeamCollection();
    teamCollection.setNumTeams(2);
    this.set({ 'players':    new playerLib.PlayersCollection(),
               'teams':      teamCollection,
               'gameStatus': gameStatus.NOT_STARTED });
  },
}),

GameController = function() {
  var controller = {
    initialize: function() {
      _u.bindAll(this,
                 'sync',
                 'create',
                 'read',
                 'update',
                 'deleteModel',
                 'computeUserTeam');
      this.model = new GameModel();
      return this;
    },

    // just proxy to socket.io
    listen: function(app) {
      var _this = this;

      io = io.listen(app);
      io.set('transports', ['htmlfile', 'xhr-polling', 'jsonp-polling']);
      io.sockets.on('connection', function(socket) {

        var players   = _this.model.get('players'),
            yourId    = socket.id,
            yourName  = 'Anonymous',
            isLeader  = false,
            yourTeam  = _this.computeUserTeam(yourId),
            initInfo  = { 'id':   yourId,
                          'name': yourName,
                          'isLeader': !players.length,
                          'team': yourTeam };

        players.add(initInfo);

        socket.emit('userId', yourId);

        initInfo.team = yourTeam;

        // Sends to everyone except for new user
        socket.broadcast.emit('newPlayer', initInfo);

        // LISTENERS

        socket.on('endTurn', function () {
          console.log('endTurn');
        });

        socket.on('gameStatus', function (status) {
          var leader = players.getLeader();
          if (socket.id === leader.get('id')) {
            _this.model.set({ 'gameStatus': status });
            socket.broadcast.emit('gameStatus', status);
          }
          else {
            console.log('tried to change game status but wasn\'t the leader');
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
          _this.model.get('teams').removePlayer(id);

          socket.broadcast.emit('playerDisconnect', id);
          console.log(socket.id + ' disconnected');
        });

        socket.on('sync', function(data) {
          _this.sync(data, socket);
        });

        pict.listen(socket);

      });

    },

    sync: function(data, socket) {
      console.log('syncing:');
      console.log(data);
      if (data.method === 'create') {
        this.create(data, socket);
      }
      if (data.method === 'read') {
        this.read(data, socket);
      }
      if (data.method === 'update') {
        this.update(data, socket);
      }
      if (data.method === 'delete') {
        // "delete" is a reserved keyword
        this.deleteModel(data, socket);
      }
    },

    create: function(data, socket) {
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

    deleteModel: function(data, socket) {
    },

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
