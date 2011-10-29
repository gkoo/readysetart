var GameInfoView = Backbone.View.extend({
  initialize: function() {
    _.bindAll(this, 'setGameStatus');
  },

  setGameStatus: function(status) {
    this.$('.status').text('Game has started.');
  }
});
