var PlayerView = Backbone.View.extend({
  tagName: 'li',

  initialize: function() {
    // bind "this" to PlayerView
    _.bindAll(this, 'render');
    this.model.bind('change', this.render, this); // update the view every time the model changes.
    //this.isCurrUser = o.isCurrUser;
    this.render();
  },

  render: function() {
    var el = $(this.el);
    el.text(this.model.get('name'));
    el.attr('id', 'player-' + this.model.get('id'));
    el.addClass('player');
    if (this.isCurrUser) {
      el.addClass('currUser');
    }
    return el;
  }
}),

PlayersView = Backbone.View.extend({
  initialize: function() {
    _.bindAll(this,
              'render',
              'renderNewPlayer',
              'handleNewPlayer',
              'handlePlayerName',
              'removePlayer');

    this.playerViews = [];

    this.collection.each(this.renderNewPlayer);
    this.collection.bind('add', this.renderNewPlayer);
    this.collection.bind('remove', this.removePlayer);
  },

  render: function() {
    var newContainer = $('<ul>').addClass('playerList'),
        playerList = this.$('.playerList'),
        _this = this;

    this.playerViews = [];
    this.collection.each(function(playerModel) {
      var newPlayerView = new PlayerView({ model: playerModel });
      newContainer.append(newPlayerView.render());
    });
    /*
    _.each(this.playerViews, function(playerView) {
      newContainer.append(playerView.render());
    });
    */

    playerList.replaceWith(newContainer);
    return this.el;
  },

  renderNewPlayer: function(playerModel) {
    var newPlayerView = new PlayerView({ model: playerModel });
    this.playerViews.push(newPlayerView);
    this.$('.playerList').append(newPlayerView.render());
  },

  // add a listing for a new player who has just
  // connected
  handleNewPlayer: function(id, name) {
    renderNewPlayer(new PlayerModel({ id:   id,
                                      name: name ? name : 'Player ' + id }));
  },

  handlePlayerName: function(o) {
    var playerView;
    if (o && o.isSelf) {
      o.id = this.currUserId;
    }
    playerView = _.detect(this.playerViews, function(view) { return view.model.get('id') === o.id; });
    playerView.model.set({ 'name': o.name });
    if (o.sync) {
      playerView.model.save();
    }
  },

  removePlayer: function(o) {
    var playerViewToRemove = _.find(this.playerViews, function(view) {
      return view.model.id === o.id;
    });
    if (playerViewToRemove) {
      $(playerViewToRemove.el).remove();

      // remove the view from the playerViews array
      this.playerViews = _.without(this.playerViews, playerViewToRemove);
    }
    else {
      console.log('[err] couldn\'t find playerView to remove');
    }
  }
});
