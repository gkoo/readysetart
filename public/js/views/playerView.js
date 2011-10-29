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
});
