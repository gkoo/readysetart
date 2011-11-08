var WordBase = require('./wordbase/wordbase.js');

module.exports = (function() {
  var pictionary = {
    initialize: function() {
      this.wordBase = WordBase;
      return this;
    },
    listen: function(socket) {
      socket.on('newStrokePub', function(segment) {
        console.log('\n\n\nNewStrokePub');
        console.log(segment);
        socket.broadcast.emit('newStrokeSub', segment);
      });
      socket.on('clearBoard', function() {
        socket.broadcast.emit('clearBoard');
      });
    }
  };
  return pictionary.initialize();
})();
