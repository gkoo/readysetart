Pictionary.ChangeNameView = Backbone.View.extend({
  initialize: function() {
    _.bindAll(this, 'handleName', 'show');
    _.extend(this, Backbone.Events);
  },

  events: {
    'submit #nameForm': 'handleName'
  },

  show: function () {
    var bodyHt = $(document.body).height(),
        windowHt = $(window).height(),
        overlayHt = bodyHt > windowHt ? bodyHt : windowHt;
    this.$('.overlay').height(overlayHt + 'px');
    this.$el.show();
  },

  hide: function () {
    this.$el.hide();
  },

  handleName: function(evt) {
    evt.preventDefault();
    evt.stopPropagation();

    this.trigger('setName', this.$('.nameField').val());

    this.$el.hide();
    this.unbind();
    this.$('#nameForm').unbind();
  }
});
