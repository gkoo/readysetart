Pictionary.ChangeNameView = Backbone.View.extend({
  initialize: function() {
    _.bindAll(this);
    _.extend(this, Backbone.Events);
    Pictionary.getEventMediator().bind('beginChangeName',
                                       this.show);
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

    Pictionary.getEventMediator().trigger('setName', this.$('.nameField').val());

    this.$el.hide();
  }
});
