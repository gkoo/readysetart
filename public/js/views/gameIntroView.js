var GameIntroView = Backbone.View.extend({
  initialize: function() {
    _.bindAll(this, 'handleName');
    _.extend(this, Backbone.Events);
  },

  events: {
    'submit #nameForm': 'handleName'
  },

  handleName: function(evt) {
    // Why is this handler getting called multiple times???
    evt.preventDefault();
    evt.stopPropagation();

    this.trigger('setName', this.$('.nameField').val());

    this.el.hide();
    this.unbind();
    this.$('#nameForm').unbind();
  }
});
