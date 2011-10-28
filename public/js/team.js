// TODO: add binding on the "add" event for TeamCollection for initializing the Team View on client load.

var _u, Backbone, isServer = false;

// Set up dependencies.
if (typeof module !== 'undefined') {
  isServer  = true;
  _u        = require('underscore');
  Backbone  = require('backbone');
}
else {
  _u = _;
}

// Attributes
// ==========
// @teamName: String
// @players:  [Number] <== array of player IDs
// @score:    Number
// @wins:     Number
TeamModel = Backbone.Model.extend();

TeamCollection = Backbone.Collection.extend({
  model: TeamModel,

  url: '/teams',

  initialize: function() {
    _u.extend(this, Backbone.Events);
    _u.bindAll(this, 'addPlayer');
  },

  setNumTeams: function(numTeams) {
    var i, teams = [];
    if (numTeams) {
      for (i=0,len=numTeams; i<len; ++i) {
        teams.push({ 'id': i,
                     'teamName': 'Team ' + i,
                     'players': [] });
      }
      this.add(teams);
    }
  },

  getMinPlayerTeam: function() {
    // Find the team with the fewest number of players and place the user on
    // that team. If all teams have equal numbers of players, just put them
    // in a random team.
    var teams = this.sortBy(function(team) {
      return team.get('players').length;
    });
    return teams[0];
  },

  getPlayerTeam: function(userId) {
    // Find the team that a player belongs to.
    return this.find(function(team) {
      // Look through each team.
      var player = _u.find(team.get('players'), function(playerId) {
        // Look through the team's players.
        if (playerId === userId) {
          return true;
        }
      });

      if (player) {
        return true;
      }
    });
  },

  addPlayer: function(player) {
    var teamNum = player.team,
        team = typeof teamNum !== 'undefined' ? this.get(teamNum) : null,
        teamPlayers;

    if (typeof team === 'undefined') {
      console.log('[err] player\'s team not set');
    }
    else {
      try {
        teamPlayers = team.get('players');
        var duplicate = _.find(teamPlayers, function(teamPlayer) {
          return teamPlayer.id === player.id;
        });
        if (duplicate) {
          console.log('[err] found a duplicate player with the same id: ' + player.id);
          return;
        }
        teamPlayers.push(player.id);
        team.set({ 'players': teamPlayers });
        // god. only UI changes that update the model will trigger a 'change' event.
        team.trigger('change');
      }
      catch (e) {
        console.log(e);
      }
    }
  },

  removePlayer: function(userId) {
    // Find which team a user is on
    // and remove him from that team.
    var team = this.getPlayerTeam(userId),
        teamPlayers,
        i;

    if (team) {
      teamPlayers = team.get('players');
    }
    else {
      console.log('[ERR] couldn\'t find the team that user ' + userId + ' is on!');
      return;
    }
    for (i=0,len=teamPlayers.length; i<len; ++i) {
      if (teamPlayers[i] === userId) {
        teamPlayers.splice(i, 1);
        break;
      }
    }
  }
});

if (isServer) {
  exports.TeamModel = TeamModel;
  exports.TeamCollection = TeamCollection;
}
