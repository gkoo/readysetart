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

  setNumTeams: function(numTeams) {
    var i, teams = [];
    if (numTeams) {
      for (i=0,len=numTeams; i<len; ++i) {
        console.log('creating');
        // TODO: create the model explicitly
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
  }
});

if (isServer) {
  exports.TeamModel = TeamModel;
  exports.TeamCollection = TeamCollection;
}
