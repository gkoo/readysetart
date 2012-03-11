var ChatView = Backbone.View.extend({
  initialize: function(o) {
    _.extend(this, Backbone.Events);
    _.bindAll(this,
              'render',
              'renderNewMessage',
              'addChatMessage',
              'getPlayerNameById',
              'handleChatMessage',
              'displayCorrectGuess');
    this.getPlayerById = o.getPlayerById;
    this.$chatContainer = this.$('.chat-container');
    this.$chatMessages = this.$('.chat-messages');
    this.$textField  = this.$('.msg');
    this.chatHeight = this.$('.chat-container').height();
    this.render();
  },

  events: {
    'submit #chatForm': 'handleChatMessage'
  },

  // Scroll to the bottom of the chat window.
  scrollToBottom: function () {
    var paddingTop    = parseInt(this.$chatMessages.css('padding-top'), 10),
        paddingBottom = parseInt(this.$chatMessages.css('padding-bottom'), 10);
        scrollTop     = this.$chatMessages.height()

    this.$chatContainer.scrollTop(scrollTop);
  },

  render: function() {
    this.$chatMessages.empty();
    this.collection.each(this.renderNewMessage);
    this.scrollToBottom();
  },

  renderNewMessage: function(messageStr) {
    var newMsg = $('<li>').text(messageStr);
    this.$chatMessages.append(newMsg);
    this.scrollToBottom();
  },

  addChatMessage: function(message) {
    var sender = message.get('sender'),
        name   = message.get('name'),
        time   = message.get('time'),
        text   = message.get('msg');

    if (name) {
      this.renderNewMessage([name, text].join(': '));
    }
    else {
      this.renderNewMessage(text);
    }
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
    var msg = $.trim(this.$textField.val());
    if (msg) {
      this.trigger('submitMessage', msg);
      this.$textField.val('');
    }
    evt.preventDefault();
  },

  displayCorrectGuess: function(o) {
    this.renderNewMessage([o.name, 'guessed correctly:', o.msg].join(' '));
  }
});
