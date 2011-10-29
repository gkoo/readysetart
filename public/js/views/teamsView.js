var TeamView = Backbone.View.extend({
  className: 'team',

  tagName: 'li',

  initialize: function(o) {
    var _this = this;
    _.extend(this, Backbone.Events);

    this.getPlayerById = o.getPlayerById;
    this.render();
    this.model.bind('change', function() {
      _this.render();
    });
  },

  render: function() {
    var teamNameEl    = $('<h3>').text(this.model.get('teamName')),
        playersListEl = $('<ul>'),
        players       = this.model.get('players'),
        _this         = this,
        el            = $(this.el);

    _.each(players, function(playerId) {
      var playerModel = _this.getPlayerById(playerId),
          newPlayerView;
      if (playerModel) {
        newPlayerView = new PlayerView({ model: playerModel });
        playersListEl.append(newPlayerView.el);
      }
    });

    el.empty()
      .append(teamNameEl, playersListEl);
    return el;
  }
}),
TeamsView = Backbone.View.extend({
  initialize: function(o) {
    var _this = this;

    try {
      _.bindAll(this, 'createTeamView', 'render');

      this.getPlayerById = o.getPlayerById;

      this.collection.bind('add', function(team) {
        console.log('got add event on TeamsCollection');
        _this.createTeamView(team);
      });
      this.collection.bind('change', function(team) {
        console.log('got change event on TeamsCollection');
        _this.render();
      });

      this.render();
    }
    catch(e) {
      console.log(e);
    }
  },

  render: function() {
    var _this = this;
    this.childViews = [];
    this.el.empty();
    this.collection.each(function(team) {
      var newTeamView = new TeamView({ model: team,
                                       getPlayerById: _this.getPlayerById });
      _this.childViews.push(newTeamView);
      _this.el.append(newTeamView.render());
    });
    return this.el;
  },

  createTeamView: function(teamModel) {
    var newTeamView = new TeamView({ model: teamModel,
                                     getPlayerById: this.getPlayerById });
    this.el.append(newTeamView.el);

    if (!this.childViews) {
      this.childViews = [];
    }

    this.childViews.push(newTeamView);
  }
});
