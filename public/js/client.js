// TODO: fix curruser
var socket = io.connect();

$(function() {
  var PlayerView = Backbone.View.extend({
    tagName: 'li',

    initialize: function(o) {
      // bind "this" to PlayerView
      _.bindAll(this, 'render');
      this.model.bind('change', this.render, this); // update the view every time the model changes.
      this.isCurrUser = o.isCurrUser;
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
    el: $('.playersList'),

    initialize: function(o) {
      var _this = this;

      _.bindAll(this,
                'render',
                'handleNewPlayer',
                'handlePlayerName',
                'handlePlayerDisconnect');

      this.collection = o.collection;
      this.playerViews = [];

      this.collection.bind('add', function(model) {
        _this.playerViews.push(new PlayerView({ model: model,
                                                isCurrUser: model.get('id') === this.currUserId }));
        _this.render();
      });
    },

    render: function() {
      var newContainer = $('<ul>').addClass('players');
      _.each(this.playerViews, function(playerView) {
        newContainer.append(playerView.render());
      });
      this.$('.players').replaceWith(newContainer);
      return this.el;
    },

    // add a listing for a new player who has just
    // connected
    handleNewPlayer: function(id, name) {
      var newPlayerModel  = new PlayerModel({ id:   id,
                                              name: name ? name : 'Player ' + id }),
          newPlayerView   = new PlayerView({ model: newPlayerModel });

      this.playerViews.push(newPlayerView);
      $(this.el).children('.players').append(newPlayerView.render());
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

    handlePlayerDisconnect: function(id) {
      this.$('#player-'+id).remove();
    }
  }),

  GameControlsView = Backbone.View.extend({
    el: $('.controls'),

    initialize: function() {
      _.extend(this, Backbone.Events);
      _.bindAll(this, 'doEndTurn',
                      'doStartGameAndBroadcast',
                      'updateControls');
    },

    events: {
      'click .endTurnBtn': 'doEndTurn',
      'click .startGameBtn': 'doStartGameAndBroadcast'
    },

    doEndTurn: function() {
      this.trigger('endTurn');
    },

    doStartGameAndBroadcast: function() {
      socket.emit('gameStatus', gameStatus.IN_PROGRESS);
      this.trigger('gameStatus', gameStatus.IN_PROGRESS);
      this.updateControls(gameStatus.IN_PROGRESS);
    },

    updateControls: function(status) {
      if (status == gameStatus.IN_PROGRESS) {
        this.$('.startGameBtn').attr('disabled', 'disabled');
        this.$('.endTurnBtn').removeAttr('disabled');
      }
    },

    showControls: function() {
      this.el.show();
    }
  }),

  GameInfoView = Backbone.View.extend({
    el: $('.gameInfo'),

    initialize: function() {
      _.bindAll(this, 'setGameStatus');
    },

    setGameStatus: function(status) {
      this.$('.status').text('Game has started.');
    }
  }),

  GameIntroView = Backbone.View.extend({
    el: $('#intro'),

    initialize: function() {
      _.bindAll(this, 'handleName');
      _.extend(this, Backbone.Events);
    },

    events: {
      'submit #nameForm': 'handleName'
    },

    handleName: function(evt) {
      evt.preventDefault();

      this.trigger('setName', {
        isSelf: true,
        name: this.$('.nameField').val(),
        sync: true
      });

      this.el.hide();
    }
  });

  GameModel = Backbone.Model.extend(),

  GameController = function() {
    var controller = {
      initialize: function() {
        _.extend(this, Backbone.Events);
        _.bindAll(this,
                  'handleInitInfo',
                  'setupViews',
                  'initEvents',
                  'handleGameStatus',
                  'setupSocketEvents');
        this.model = new GameModel();
        this.setupViews();
        this.setupSocketEvents();
        this.initEvents();
        return this;
      },

      setupViews: function() {
        this.playersColl  = new PlayersCollection();
        this.playersView  = new PlayersView({ collection: this.playersColl });
        this.gameControls = new GameControlsView();
        this.gameInfo     = new GameInfoView();
        this.gameIntro    = new GameIntroView();
        this.boardModel   = new BoardModel();
        this.boardView    = new BoardView({ model: this.boardModel });
      },

      handleInitInfo: function(o) {
        var userPlayer,
            playersColl = this.playersColl;
        if (typeof o.id === 'undefined') {
          console.log('No player ID found.');
          return;
        }
        this.model.set({ 'userId': o.id });
        userPlayer = playersColl.get(o.id);
        this.playersView.currUserId = o.id;

        if (userPlayer && o.name) {
          userPlayer.set({ "name": o.name });
        }
        else {
          playersColl.add({
            "id": o.id,
            "name": o.name,
          });
        }

        if (o.isLeader) {
          this.leaderId = o.id;
          this.gameControls.showControls();
        }

        if (o.players) {
          playersColl.add(o.players);
        }
      },

      // SOCKET.IO EVENTS
      setupSocketEvents: function() {
        var _this = this;

        socket.on('connect', function() {
          //var name = prompt('What is your name?');
        });

        socket.on('disconnect', function() {
          console.log('disconnect');
          //var name = prompt('What is your name?');
        });

        socket.on('initInfo', this.handleInitInfo);

        socket.on('yourTurn', function () {
          _this.trigger('yourTurn');
        });

        socket.on('gameStatus', function (o) {
          _this.trigger('gameStatus', o);
        });

        socket.on('newPlayer', function(id) {
          _this.trigger('newPlayer', id);
        });

        socket.on('playerDisconnect', function(id) {
          _this.trigger('playerDisconnect', id);
        });

        socket.on('playerName', function(o) {
          _this.trigger('playerName', o);
        });

        socket.on('newStrokeSub', function(o) {
          _this.trigger('newStrokeSub', o);
        });

        $('.debugPlayers').click(function() {
          socket.emit('printPlayers');
        });
      },

      // BACKBONE EVENTS
      initEvents: function() {
        var _this = this;
        this.bind('yourTurn', function() {
          _this.toggleYourTurn(true);
        });

        this.bind('endTurn', function() {
          socket.emit('endTurn');
          _this.toggleYourTurn(false);
        });

        // PlayerView Events
        this.bind('playerDisconnect', this.playersView.handlePlayerDisconnect);
        this.bind('newPlayer',        this.playersView.handleNewPlayer);
        this.bind('playerName',       this.playersView.handlePlayerName);
        this.gameIntro.bind('setName', this.playersView.handlePlayerName);

        // Board Events
        this.boardView.bind('newStrokePub', this.broadcastStroke);
        this.bind('newStrokeSub', this.boardView.handleNewStroke);

        // Controller Events
        this.bind('gameStatus', this.handleGameStatus);
        this.bind('gameStatus', this.gameInfo.setGameStatus);
        this.bind('gameStatus', this.gameControls.updateControls);

        // Game Control Events
        this.gameControls.bind('gameStatus', this.handleGameStatus);
        this.gameControls.bind('gameStatus', this.gameInfo.setGameStatus);
      },

      toggleYourTurn: function(state) {
        console.log('toggling turn: ' + state);
        if (typeof state !== 'undefined') {
          state = true;
        }

        if (state) {
          this.statusElem.text('It is your turn');
          this.endTurnElem.removeAttr('disabled');
        }
        else {
          this.statusElem.text('It is not your turn');
          this.endTurnElem.attr('disabled', 'disabled');
        }
      },

      handleGameStatus: function(status) {
        if (status === gameStatus.IN_PROGRESS) {
          // fix this function! move logic to a view.
          if (this.model.get('gameStatus') === gameStatus.IN_PROGRESS) { return; }
          this.model.set({ gameStarted: gameStatus.IN_PROGRESS });
        }
      },

      broadcastStroke: function(segments) {
        socket.emit('newStrokePub', segments);
      },
    };
    return controller.initialize();
  },

  gameController = new GameController();

  Backbone.sync = function(method, model) {
    socket.emit('sync', {
      method: method,
      model: model
    });
  };
});
