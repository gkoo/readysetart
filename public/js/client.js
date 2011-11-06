// TODO: fix curruser

var socket = io.connect();

$(function() {
  var gameController;

  Backbone.sync = function(method, model) {
    console.log('syncing...');
    socket.emit('sync', { 'model': model, 'method': method });
  };

  gameController = new GameController(socket);
});
