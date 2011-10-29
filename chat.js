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
    _u.bindAll(this,
               'addMessages',
               'listen');

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
  listen: function(io) {
    var _this = this;
    io.of('/chat').on('connection', function(socket) {
      socket.on('newMessages', function(newMessages) {
        if (!newMessages || !newMessages.length) {
          console.log('[err] empty newMessages in chat');
        }
        else {
          _this.addMessages(newMessages);
          socket.broadcast.emit('incomingMessages', newMessages);
        }
      });
    });
  }
});
