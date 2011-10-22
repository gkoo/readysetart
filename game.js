var io = require('socket.io'),
    _u = require('underscore'),
    Backbone = require('backbone'),

    playerLib         = require('./public/js/player.js'),
    statusLib         = require('./public/js/gameStatus.js').GameStatus,
    PlayerModel       = playerLib.PlayerModel,
    PlayersCollection = playerLib.PlayersCollection,
    gameStatus        = new statusLib();

GameModel = Backbone.Model.extend({
  initialize: function() {
    this.set({ 'players':    new PlayersCollection(),
               'gameStatus': gameStatus.NOT_STARTED });
  },

}),

GameController = function() {
  var controller = {
    initialize: function() {
      _u.bindAll(this, 'sync');
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
            yourId    = players.length,
            yourName  = 'Player ' + yourId,
            initInfo  = { 'id':       yourId,
                          'name':     'Player ' + yourId };

        if (players.length) {
          initInfo.players = players.toJSON();
        }

        socket.set('id', yourId);

        socket.json.emit('initInfo', initInfo);

        players.add({ 'id': yourId, 'name': yourName });

        // Sends to everyone except for new user
        socket.broadcast.emit('newPlayer', yourId);

        // LISTENERS

        socket.on('endTurn', function () {
          console.log('endTurn');
        });

        socket.on('gameStatus', function (status) {
          _this.model.set({ 'gameStatus': status });
          socket.broadcast.emit('gameStatus', status);
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

        socket.on('disconnect', function(data) {
          socket.get('id', function(err, id) {
            var i, len, player;
            if (err) { console.log('[ERROR] ' + err); }

            else {
              // Remove player from players array
              players.remove(players.get(id));
              socket.broadcast.emit('playerDisconnect', id);
            }
          });
        });

        socket.on('sync', function(data) {
          _this.sync(data, socket)
        });

      });
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
