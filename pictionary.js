module.exports.listen = function(socket) {
  socket.on('newStrokePub', function(segment) {
    socket.broadcast.emit('newStrokeSub', segment);
  });
  socket.on('clearBoard', function() {
    socket.broadcast.emit('clearBoard');
  });
};
