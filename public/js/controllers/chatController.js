var ChatController = function(chatSocket) {
  var controller = {
    BUFFER_LENGTH: 10, // what does this do again?

    initialize: function(socket) {
      var _this = this;
      this.chatSocket = socket;
      _.bindAll(this, 'setupSocketEvents',
                      'addUserMessageToModel',
                      'notifyCorrectGuess',
                      'handleNameChange',
                      'handleNewLeader',
                      'handlePlayerDisconnect');
      this.collection = new MessageCollection({ bufferLength: this.BUFFER_LENGTH });

      this.view  = new ChatView({ el: $('#chat-container'),
                                  collection: this.collection });

      this.view.bind('submitMessage', this.addUserMessageToModel);
      this.collection.bind('addMessage', this.view.addChatMessage);

      setInterval(function() {
        var newMessages = _this.collection.flushOutboundMessages();
        if (newMessages && newMessages.length) {
          _this.chatSocket.emit('newMessages', newMessages); // send message to server
        }
      }, 500);
      this.setupSocketEvents();
      return this;
    },

    setupSocketEvents: function () {
      var _this = this;
      this.chatSocket.on('connect', function() {
        console.log('chat connected');
      });
      this.chatSocket.on('newPlayer', function(info) {
        _this.collection.addSysMessage(info.name + ' has joined the room.');
      });
      this.chatSocket.on('incomingMessages', this.collection.addMessage);
      this.chatSocket.on('notifyCorrectGuess', this.notifyCorrectGuess);
    },

    // called by chat view when user enters in a message
    addUserMessageToModel: function(msgStr) {
      this.collection.addMessage({ msg: msgStr,
                                   id: this.currPlayer.id,
                                   name: this.currPlayer.get('name') },
                                 true);
    },

    notifyCorrectGuess: function(o) {
      this.view.displayCorrectGuess(o);
    },

    handlePlayerDisconnect: function(model) {
      if (model.length) {
        // array of models
        _.each(model, function(m) {
          handlePlayerDisconnect(m);
        });
      }
      else {
        // just one model
        this.view.renderNewMessage(model.get('name') + ' has left the room.');
      }
    },

    handleNewLeader: function (playerModel) {
      var name = playerModel.get('name')
      this.collection.addSysMessage(name + ' has been promoted to leader.');
    },

    handleNameChange: function(o) {
      this.collection.addSysMessage(o.oldName + ' changed name to ' + o.newName + '.', true);
    }
  };
  return controller.initialize(chatSocket);
};
