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

    this.trigger('setName', {
      isSelf: true,
      name: this.$('.nameField').val(),
      sync: true
    });

    this.el.hide();
    this.unbind();
    this.$('#nameForm').unbind();
  }
});
