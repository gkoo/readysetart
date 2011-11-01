var chatSocket = io.connect('/chat'),

ChatController = function(modelJson) {
  var controller = {
    initialize: function(chatModelJson) {
      var _this = this;
      try {
        this.model = new ChatModel({ bufferLength: chatModelJson.bufferLength,
                                     messages:     new MessageCollection(chatModelJson.messages) });
        this.view  = new ChatView({ el: $('#chat-container'),
                                    model: this.model });

        this.model.currPlayer = chatModelJson.currPlayer;
        this.model.getPlayerById = chatModelJson.getPlayerById;

        this.view.bind('submitMessage', this.model.addMessage);
        this.model.bind('addMessage', this.view.addChatMessage);

        setInterval(function() {
          var newMessages = _this.model.get('outboundMessages');
          if (newMessages && newMessages.length) {
            chatSocket.emit('newMessages', newMessages); // send message to server
            _this.model.set({ 'outboundMessages': [] }); // reset unsent messages
          }
        }, 500);

        this.setupIncomingSocketEvents();
      }
      catch(e) {
        console.log(e);
      }
      return this;
    },

    notifyCorrectGuess: function(o) {
      this.view.displayCorrectGuess(o);
    },

    setupIncomingSocketEvents: function() {
      chatSocket.on('incomingMessages', this.model.addMessages);
    },
  };
  return controller.initialize(modelJson);
};
