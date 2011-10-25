// TODO: teams

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
            initInfo  = { 'id':   yourId,
                          'name': yourName,
                          'isLeader': false },
            yourTeam;

        yourTeam  = _this.computeUserTeam(yourId);

        if (players.length) {
          // send existing player info
          initInfo.players = players.toJSON();
        }
        else {
          isLeader = true;
          initInfo.isLeader = isLeader;
        }

        socket.json.emit('initInfo', initInfo);

        players.add({ 'id': yourId, 'name': yourName, 'isLeader': isLeader });

        // Sends to everyone except for new user
        socket.broadcast.emit('newPlayer', yourId);

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
          socket.broadcast.emit('playerDisconnect', id);
          console.log(socket.id + ' disconnected');
        });

        socket.on('sync', function(data) {
          _this.sync(data, socket)
        });

        pict.listen(socket);

      });
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

    sync: function(data, socket) {
      var method = data.method,
          model  = data.model,
          player;

      if (model.type === 'player') {
        if (method !== 'update') {
          console.log('[warning] method !== update during player sync');
        }
        player = this.model.get('players').get(model.id);
        player.set(model);
        socket.json.broadcast.emit('playerName', {
          id: model.id,
          name: model.name
        });
      }
      else {
        console.log('[error] no type found during sync');
      }
    }
  }
  return controller.initialize();
};

module.exports = new GameController();
