var _u = require('underscore'),
    Backbone = require('backbone'),

MessageCollection = Backbone.Collection.extend({
  initialize: function() {
    _u.bindAll(this, 'addMessages');
    this.bufferLength = 10;
  },

  comparator: function(message) {
    return message.get('time') || 0;
  },

  addMessages: function(newMessages) {
    var bufLength = this.bufferLength,
        numMessages = this.length,
        modelsToRemove, i, len;

    this.add(newMessages);

    if (numMessages > bufLength) {
      modelsToRemove = this.models.slice(0, numMessages-bufLength);
      this.remove(modelsToRemove);
    }
  },

}),

ChatController = function () {
  var _this = this,
      io;

  // Function: listen
  // ================
  // Takes a Socket.IO object and listens on the 'chat'
  // namespace.
  this.listen = function (socketio) {
    io = socketio.of('/chat'); // SocketNamespace
    io.on('connection', function(socket) {
      console.log('\n\n\nchat connected');
      socket.on('newMessages', function(newMessages) {
        if (!newMessages || !newMessages.length) {
          console.log('[err] empty newMessages in chat');
        }
        else {
          _this.collection.addMessages(newMessages);
          _this.trigger('newMessages', { 'messages': newMessages,
                                         'callback': _this.handleCorrectGuess,
                                         'socket':   socket });
          console.log('emitting incoming');
          socket.broadcast.emit('incomingMessages', newMessages);
        }
      });
    });
  };

  this.handleCorrectGuess = function(correctGuess, socket) {
    io.emit('notifyCorrectGuess', correctGuess);
  };

  this.broadcastNewPlayer = function (playerInfo) {
    io.emit('newPlayer', playerInfo);
  };

  this.log = function(str) {
    console.log('[CHAT] ' + str);
  };

  this.initialize = function () {
    _u.extend(this, Backbone.Events);
    this.collection = new MessageCollection();
    return this;
  };

  return this.initialize();
};

module.exports = new ChatController();
