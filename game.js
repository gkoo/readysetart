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
    Backbone = require('backbone'),

    playerLib      = require('./player.js'),

GameModel = Backbone.Model.extend({
  initialize: function (opt) {
    var time = (new Date()).getTime(); // arbitrary id so that isNew
                                       // is false on client side when
                                       // saving.
    this.set({ 'id':         time,
               'players':    new playerLib.PlayersCollection(),
               'gameStatus': new Backbone.Model({ 'turnDuration': opt.turn_duration,
                                                  'warmupDuration': opt.turn_break_duration,
                                                  'id': time })
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
