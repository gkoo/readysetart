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

  TeamView = Backbone.View.extend({
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
  }),

  GameControlsView = Backbone.View.extend({
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

  ChatView = Backbone.View.extend({
  }),

  GameInfoView = Backbone.View.extend({
    initialize: function() {
      _.bindAll(this, 'setGameStatus');
    },

    setGameStatus: function(status) {
      this.$('.status').text('Game has started.');
    }
  }),

  GameIntroView = Backbone.View.extend({
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
  }),

  GameModel = Backbone.Model.extend({
    url: '/gamemodel',

    initialize: function() {
      this.set({ 'type': 'game' });
    }
  }),

  GameController = function() {
    var controller = {
      initialize: function() {
        _.extend(this, Backbone.Events);
        _.bindAll(this,
                  'createResponse',
                  'readResponse',
                  'updateResponse',
                  'deleteResponse',
                  'handleInitInfo',
                  'setupViews',
                  'fetchModels',
                  'initEvents',
                  'handleGameStatus',
                  'setupSocketEvents');
        this.model = new GameModel();
        this.setupSocketEvents();
        return this;
      },

      setupViews: function() {
        try {
          this.teamsView    = new TeamsView({ el:            $('.teamsList'),
                                              collection:    this.teamsColl,
                                              getPlayerById: this.playersColl.getPlayerById });
        } catch (e) {
          console.log(e);
        }

        this.gameControls = new GameControlsView({ el: $('.controls') });
        this.gameInfo     = new GameInfoView({ el: $('.gameInfo') });
        this.gameIntro    = new GameIntroView({ el: $('#intro') });
        this.boardModel   = new BoardModel();
        this.boardView    = new BoardView({ model: this.boardModel });
      },

      fetchModels: function() {
        var _this = this;
        this.model.fetch();
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

        // set up teams
        if (o.teams) {
          this.teamsColl.add(o.teams);
        }
      },

      // SOCKET.IO EVENTS
      setupSocketEvents: function() {
        var _this = this;

        socket.on('connect', function() {
          _this.fetchModels();
        });

        socket.on('disconnect', function() {
          console.log('disconnect');
          //var name = prompt('What is your name?');
        });

        socket.on('readResponse', this.readResponse);

        socket.on('userId', function(id) {
          _this.model.set({ 'userId': id });
        });

        socket.on('initInfo', this.handleInitInfo);

        socket.on('yourTurn', function () {
          _this.trigger('yourTurn');
        });

        socket.on('gameStatus', function (o) {
          _this.trigger('gameStatus', o);
        });

        socket.on('playerUpdate', function(player) {
          _this.trigger('playerUpdate', player);
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

        this.gameIntro.bind('setName', function(o) {
          o.id = _this.model.get('userId');
          _this.playersColl.setPlayerName(o);
        });

        // PlayerCollection Events
        this.bind('newPlayer',    this.playersColl.handleNewPlayer);
        this.bind('playerUpdate', this.playersColl.playerUpdate);
        this.bind('playerName',   this.playersColl.setPlayerName);

        // TeamCollection Events
        this.bind('newPlayer', this.teamsColl.addPlayer);

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

      // SYNC RESPONSE HANDLERS
      createResponse: function() {
      },

      // SYNC RESPONSE HANDLERS
      readResponse: function(data) {
        var players, teams, currUserId = this.model.get('userId');
        if (!data || !data.type || !data.model) {
          console.log('[err] couldn\'t detect data');
          return;
        }
        if (data.type === 'game') {
          try {
            players = data.model.players;
            teams = data.model.teams;
            this.playersColl = new PlayersCollection(players);
            this.teamsColl = new TeamCollection(teams);
            this.setupViews();
            this.initEvents();

            // set leader
            if (currUserId && this.playersColl.get(currUserId).get('isLeader')) {
              this.gameControls.showControls();
            }
          }
          catch (e) {
            console.log(e);
          }
        }
      },

      // SYNC RESPONSE HANDLERS
      updateResponse: function() {
      },

      // SYNC RESPONSE HANDLERS
      deleteResponse: function() {
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
      }
    };
    return controller.initialize();
  },

  gameController = new GameController();

  Backbone.sync = function(method, model) {
    console.log('syncing...');
    console.log('method: ' + method);
    console.log(model);
    socket.emit('sync', { 'model': model, 'method': method });
  };
});
