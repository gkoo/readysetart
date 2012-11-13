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

  /*
  this.create = function (data, socket) {
  };

  this.read = function () {
  };
  */

  this.update = function (data, socket) {
    var mCollection;
    if (typeof socket.joinedRoom !== 'string') { return; }

    mCollection = this.messageCollections[socket.joinedRoom];
    if (typeof mCollection === 'undefined') { return; }

    mCollection.add(data.model);
    this.trigger('newMessage', { 'message': data.model,
                                 'callback': this.handleCorrectGuess,
                                 'socket':   socket });
    socket.json.broadcast.to(socket.joinedRoom).emit('incomingMessage', data.model);
  };

  /*
  this.del = function () {
  };
  */

  // Function: listen
  // ================
  // Takes a Socket.IO object and listens on the 'chat'
  // namespace.
  this.listen = function (socketio) {
    io = socketio.of('/chat'); // SocketNamespace
    io.on('connection', (function(socket) {
      socket.on('join', (function (room) {
        var oldRoom, players;

        if (typeof room !== "string") {
          return;
        }

        // Make sure the socket is only in one room at a time.
        if (typeof socket.joinedRoom !== 'undefined') {
          // socket is joining room it's already in, so return.
          if (room === socket.joinedRoom) { return; }

          socket.leave(socket.joinedRoom);
        }

        socket.join(room);
        socket.joinedRoom = room; // store for easy look up later

        // Create chat room if it doesn't exist already
        if (!this.messageCollections[room]) {
          this.messageCollections[room] = new MessageCollection();
        }
      }).bind(this));

      socket.on('newMessages', function(newMessages) {
        if (!newMessages || !newMessages.length) {
          console.log('[err] empty newMessages in chat');
        }
        else {
          _this.collection.addMessages(newMessages);
          _this.trigger('newMessages', { 'messages': newMessages,
                                         'callback': _this.handleCorrectGuess,
                                         'socket':   socket });
          socket.broadcast.emit('incomingMessages', newMessages);
        }
      });

      socket.on('sync', (function (data) {
        this[data.method](data, socket);
      }).bind(this));
    }).bind(this));
  };

  this.handleCorrectGuess = function(correctGuess, socket) {
    io.emit('notifyCorrectGuess', correctGuess);
  };

  this.broadcastNewPlayer = function (playerInfo, room) {
    console.log('broadcasting new player');
    io.in(room).emit('newPlayer', playerInfo);
  };

  this.log = function(str) {
    console.log('[CHAT] ' + str);
  };

  this.initialize = function () {
    _u.extend(this, Backbone.Events);
    _u.bindAll(this);
    this.messageCollections = {}; // keyed by room
    return this;
  };

  return this.initialize();
};

module.exports = new ChatController();
