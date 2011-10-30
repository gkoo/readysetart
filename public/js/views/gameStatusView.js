var GameStatusView = Backbone.View.extend({
  initialize: function() {
    _.bindAll(this, 'render');
    this.model.bind('change', this.render);
    this.render();
  },

  render: function() {
    if (this.model.get('gameStatus') === GameStatusEnum.IN_PROGRESS) {
      this.$('.status').text('Game has started.');
    }
    this.el.show();
  }
});
