var GameStatus = function() {
  this.NOT_STARTED = 0,
  this.IN_PROGRESS = 1,
  this.FINISHED    = 2;
}

if (typeof exports !== 'undefined') {
  exports.GameStatus = GameStatus;
}
else {
  gameStatus = new GameStatus();
}
