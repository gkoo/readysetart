var _u = require('underscore'),
    Backbone = require('backbone'),

MessageModel = Backbone.Model.extend(),

MessageCollection = Backbone.Collection.extend({
  model: MessageModel,
  comparator: function(message) {
    return message.get('time') || 0;
  }
});

module.exports.ChatModel = Backbone.Model.extend({
  initialize: function(o) {
    _u.extend(this, Backbone.Events);
    _u.bindAll(this,
               'addMessages',
               'listen',
               'handleCorrectGuess');

    this.set({ 'messages': new MessageCollection(),
               'bufferLength': 10 });
  },

  addMessages: function(newMessages) {
    var bufLength = this.get('bufferLength'),
        messagesColl = this.get('messages'),
        numMessages = messagesColl.length,
        modelsToRemove, i, len;

    messagesColl.add(newMessages);

    if (numMessages > bufLength) {
      modelsToRemove = messagesColl.models.slice(0, numMessages-bufLength);
      messagesColl.remove(modelsToRemove);
    }
  },

  // Function: listen
  // ================
  // Takes a Socket.IO object and listens on the 'chat'
  // namespace.
  listen: function(socket) {
    var _this = this;
    socket.on('newMessages', function(newMessages) {
      if (!newMessages || !newMessages.length) {
        console.log('[err] empty newMessages in chat');
      }
      else {
        _this.addMessages(newMessages);
        _this.trigger('newMessages', { 'messages': newMessages,
                                       'callback': _this.handleCorrectGuess,
                                       'socket':   socket });
        socket.broadcast.emit('incomingMessages', newMessages);
      }
    });
  },

  handleCorrectGuess: function(correctGuess, socket) {
    socket.emit('notifyCorrectGuess', correctGuess);
    socket.broadcast.emit('notifyCorrectGuess', correctGuess);
  }
});
