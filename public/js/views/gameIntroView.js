var GameIntroView = Backbone.View.extend({
  initialize: function() {
    _.bindAll(this, 'handleName');
    _.extend(this, Backbone.Events);
  },

  events: {
    'submit #nameForm': 'handleName'
  },

  handleName: function(evt) {
    evt.preventDefault();
    evt.stopPropagation();

    this.trigger('setName', this.$('.nameField').val());

    this.el.hide();
    this.unbind();
    this.$('#nameForm').unbind();
  }
});
