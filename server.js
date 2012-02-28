
/**
 * Module dependencies.
 */

var app = require('./routes.js'),
    socketio = require('socket.io').listen(app),
    game = require('./game.js'),
    chat = require('./chat.js');

socketio.set('transports', ['htmlfile',
                            'xhr-polling',
                            'jsonp-polling']);

// prevent socket.io's log messages from cluttering the console output
socketio.set('log level', 0);

game.listen(socketio);
chat.listen(socketio);

game.setChat(chat);
