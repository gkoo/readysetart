var GameModel = Backbone.Model.extend({
  url: '/gamemodel',

  initialize: function() {
    this.set({ 'type': 'game' });
  }
});
