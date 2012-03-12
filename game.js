// NOTE: maybe i should decompose out the syncing.
//
// Plan for picking drawer. At time of game start, pre-calculate
// schedule of drawers. This way, if people come and go during
// the middle of the game, they can still participate and guess,
// but it won't mess up who gets to draw, etc.
//
// TODO: a way to restart the game
// TODO: handle case where currArtist disconnects
// TODO: handle case where leader disconnects
// TODO: re-enable start button after all turns are over
// TODO: figure out messaging that says "leader will start the game."
//       ("how do i draw" whenever someone looks at it)

var _u       = require('underscore'),
    pict     = require('./pictionary.js'),
    chatLib  = require('./chat.js'),
    Backbone = require('backbone'),

    //playerLib      = require('./public/js/models/playerModel.js'),
    playerLib      = require('./player.js'),
    //teamLib      = require('./public/js/models/teamModel.js'),
    gameStatusLib  = require('./public/js/models/gameStatusModel.js'),

GameModel = Backbone.Model.extend({
  initialize: function (opt) {
    this.set({ 'players':    new playerLib.PlayersCollection(),
               'gameStatus': new gameStatusLib.GameStatusModel({ 'turnDuration': opt.turn_duration,
                                                                 'warmupDuration': opt.turn_break_duration }),
             });
  }
}),

GameController = module.exports.GameController = function (opt) {
  this.initialize = function () {
    _u.bindAll(this);
    _u.extend(this, Backbone.Events);

    return this;
  };

  this.setChat = function (chat) {
    this.chatController = chat;
  };

  this.sync = function (data, socket) {
    if (data.method === 'read') {
      this.read(data, socket);
    }
    if (data.method === 'update') {
      this.update(data, socket);
    }
  };

  this.read = function (data, socket) {
    if (data.model.type === 'game') {
      socket.emit('readResponse', { 'type': 'game',
                                    'model': this.model,
                                    'userId': socket.id });
    }
  };

  this.update = function (data, socket) {
    var player;
    if (data.model.type === 'player') {
      player = this.model.get('players').get(data.model.id);
      player.set(data.model);
      console.log('broadcasting playerUpdate');
      socket.broadcast.emit('playerUpdate', data.model);
    }
  };

  /*
  computeUserTeam = function (userId) {
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

  this.updatePlayer = function (o, res) {
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
  };

  this.model = new GameModel(opt);

  return this.initialize();
};
