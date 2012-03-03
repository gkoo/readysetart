
/**
 * Module dependencies.
 */

var app         = require('./routes.js'),
    socketio    = require('socket.io').listen(app),
    pictionary  = require('./pictionary.js'),
    chat        = require('./chat.js');

socketio.set('transports', ['xhr-polling']);

// prevent socket.io's log messages from cluttering the console output
// socketio.set('log level', 0);

console.log('pictionary about to listen');
pictionary.listen(socketio)
          .setChat(chat);
chat.listen(socketio);

