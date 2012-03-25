// Properties:
// @id
// @name
// @isLeader
Pictionary.PlayersCollection = Backbone.Collection.extend({
  url: 'game/players',

  initialize: function() {
    var eventMediator = Pictionary.getEventMediator();
    _.extend(this, Backbone.Events);
    _.bindAll(this,
               'getLeader',
               'setPlayerName',
               'handleNewPlayer',
               'promoteLeader',
               'playerUpdate',
               'playerDisconnect');

    eventMediator.bind('newPlayer', this.handleNewPlayer);
    eventMediator.bind('playerUpdate', this.playerUpdate);
    eventMediator.bind('playerDisconnect', this.playerDisconnect);
    this.on('add', function (models) {
      eventMediator.trigger('addedPlayer', models);
    });
    this.on('remove', function (models) {
      eventMediator.trigger('removedPlayer', models);
    });
  },

  getLeader: function () {
    return this.find(function(player) {
      return player.get('isLeader');
    });
  },

  setPlayerName: function (o) {
    var playerModel = this.get(o.id);
    if (playerModel) {
      Pictionary.getEventMediator().trigger('changePlayerName',
                                            { oldName: playerModel.get('name'),
                                              newName: o.name });
      playerModel.save({ 'name': o.name });
    }
    else {
      console.log("[err] couldn't find player. something is wrong.");
    }
  },

  // TODO: add a "add" binding to playerscollection to render a new playerview
  handleNewPlayer: function(o) {
    this.add(o);
  },

  playerUpdate: function(o) {
    this.get(o.id).set(o);
  },

  promoteLeader: function (newLeaderId) {
    // TODO: hide controls from old leader
    var newLeader = this.get(newLeaderId),
        eventMediator = Pictionary.getEventMediator();

    if (newLeader) {
      newLeader.set({ 'isLeader': true });
      eventMediator.trigger('newLeader', newLeader);
      if (newLeader.id === this.userId) {
        eventMediator.trigger('promotedToLeader');
      }
    }
    else {
      console.log('[err] couldn\'t find new leader');
    }
  },

  playerDisconnect: function(data) {
    var playerToRemove = this.get(data.id);

    if (playerToRemove) {
      this.remove(playerToRemove);
    }
    else {
      console.log('[err] couldn\'t find player to remove');
    }

    if (data.newLeaderId) { this.promoteLeader(data.newLeaderId); }
  }
});
