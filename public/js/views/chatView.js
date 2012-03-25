Pictionary.ChatView = Backbone.View.extend({
  initialize: function(o) {
    _.extend(this, Backbone.Events);
    _.bindAll(this,
              'render',
              'renderNewMessage',
              'renderUserMessage',
              'addChatMessage',
              'getPlayerNameById',
              'handleChatMessage',
              'displayCorrectGuess');
    this.getPlayerById = o.getPlayerById;
    this.$chatContainer = this.$('.chat-container');
    this.$chatMessages = this.$('.chat-messages');
    this.$textField  = this.$('.msg');
    this.chatHeight = this.$('.chat-container').height();
    this.chatMsgTemplate = _.template('<li class="chatMsg"><span class="userName"><%= name %></span>: <span class="chatMsgText"><%= msg %></span></li>');
    this.render();
  },

  events: {
    'submit #chatForm': 'handleChatMessage',
    'click #changeNameBtn': 'changeName'
  },

  // Returns true if chat window is already scrolled to
  // bottom.
  atBottomOfChat: function () {
    var currScrollTop = this.$chatContainer.scrollTop();
    return currScrollTop >= this.$chatMessages.height() - this.chatHeight - 20; /* 20 pixel just acts as buffer */
  },

  // Scroll to the bottom of the chat window.
  scrollToBottom: function () {
    var newScrollTop  = this.$chatMessages.height();
    this.$chatContainer.scrollTop(newScrollTop);
  },

  render: function() {
    this.$chatMessages.empty();
    this.collection.each(this.renderNewMessage);
    this.scrollToBottom();
  },

  renderNewMessage: function(messageStr) {
    var newMsg = $('<li>').addClass('chatMsg').text(messageStr),
        wasAtBottom = this.atBottomOfChat();

    this.$chatMessages.append(newMsg);
    // Only scroll to bottom if we were originally at bottom.
    if (wasAtBottom) {
      this.scrollToBottom();
    }
  },

  renderUserMessage: function(name, text) {
    var chatMsgHtml = this.chatMsgTemplate({ "name": name, "msg": text }),
        wasAtBottom = this.atBottomOfChat();

    this.$chatMessages.append($(chatMsgHtml));
    // Only scroll to bottom if we were originally at bottom.
    if (wasAtBottom) {
      this.scrollToBottom();
    }
  },

  addChatMessage: function(message) {
    var sender = message.get('sender'),
        name   = message.get('name'),
        time   = message.get('time'),
        text   = message.get('msg');

    if (name && text) {
      this.renderUserMessage(name, text);
    }
    else if (text) {
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
    evt.preventDefault();
    if (msg) {
      Pictionary.getEventMediator().trigger('submitChatMessage', msg);
      this.$textField.val('');
    }
    this.scrollToBottom();
  },

  changeName: function () {
    Pictionary.getEventMediator().trigger('beginChangeName');
  },

  displayCorrectGuess: function(o) {
    this.renderNewMessage([o.name, 'guessed correctly:', o.msg].join(' '));
  }
});
