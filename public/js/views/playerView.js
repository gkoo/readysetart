var PlayerView = Backbone.View.extend({
  tagName: 'li',

  initialize: function(o) {
    // bind "this" to PlayerView
    _.bindAll(this, 'render');
    this.model.bind('change', this.render, this); // update the view every time the model changes.
    this.getCurrPlayer = o.getCurrPlayer;
    this.render();
  },

  render: function() {
    var el         = $(this.el),
        model      = this.model,
        currPlayer = this.getCurrPlayer(),
        className  = 'player';

    el.text(model.get('name'));
    el.attr('id', 'player-' + this.model.get('id'));
    if (model.get('isLeader')) {
      className += ' leader';
    }
    el.addClass(className);
    if (currPlayer && model.id === currPlayer.id) {
      el.addClass('currUser');
    }
    return el;
  }
}),

PlayersView = Backbone.View.extend({
  initialize: function(o) {
    _.bindAll(this,
              'createNewPlayerView',
              'render',
              'renderNewPlayer',
              'handleNewPlayer',
              'handlePlayerName',
              'removePlayer');

    this.playerViews = [];
    this.getCurrPlayer = o.getCurrPlayer;

    this.collection.each(this.renderNewPlayer);
    this.collection.bind('add', this.renderNewPlayer);
    this.collection.bind('remove', this.removePlayer);
  },

  createNewPlayerView: function(model) {
    return new PlayerView({ model: model,
                            getCurrPlayer: this.getCurrPlayer });
  },

  render: function() {
    var newContainer = $('<ul>').addClass('playerList'),
        playerList = this.$('.playerList'),
        _this = this;

    this.playerViews = [];
    this.collection.each(function(playerModel) {
      var newPlayerView = _this.createNewPlayerView(playerModel);
      newContainer.append(newPlayerView.render());
      _this.playerViews.push(newPlayerView);
    });

    playerList.replaceWith(newContainer);
    return this.el;
  },

  renderNewPlayer: function(playerModel) {
    var newPlayerView = this.createNewPlayerView(playerModel);
    this.playerViews.push(newPlayerView);
    this.$('.playerList').append(newPlayerView.render());
  },

  // add a listing for a new player who has just connected
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
      return view.$el.attr('id') === 'player-' + o.id;
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
