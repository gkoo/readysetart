var ChatView = Backbone.View.extend({
  initialize: function(o) {
    _.extend(this, Backbone.Events);
    _.bindAll(this,
              'render',
              'renderNewMessage',
              'getPlayerNameById',
              'handleChatMessage');
    this.getPlayerById = o.getPlayerById;
    this.chatWindow = this.$('.chat');
    this.textField  = this.$('.msg');
    this.render();
  },

  events: {
    'submit #chatForm': 'handleChatMessage'
  },

  render: function() {
    this.chatWindow.empty();
    this.model.get('messages').each(this.renderNewMessage);
  },

  renderNewMessage: function(message) {
    var sender = message.get('sender'),
        name   = message.get('name'),
        time   = message.get('time'),
        text   = message.get('message'),
        newMsg = $('<li>').text([name, text].join(': '));

    this.chatWindow.append(newMsg);
  },

  getPlayerNameById: function(id) {
    var player = this.getPlayerById(id);
    if (player) {
      return player.get('name');
    }
    else {
      console.log('[err] No player by that id. Unable to fetch name.');
      return '';
    }
  },

  handleChatMessage: function(evt) {
    var msg = $.trim(this.textField.val());
    if (msg) {
      this.trigger('submitMessage', msg);
      this.textField.val('');
    }
    evt.preventDefault();
  }
});
