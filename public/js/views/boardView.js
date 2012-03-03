// TODO: clear the board when someone makes a correct guess

var BoardView = Backbone.View.extend({
  initialize: function() {
    paper.install(window); // Injects the paper scope into the window scope. Maybe should revisit this.
    paper.setup(document.getElementById('gameBoard'));

    _.extend(this, Backbone.Events);
    _.bindAll(this,
              'doClear',
              'doDrawSleep',
              'clearBoard',
              'mouseDown',
              'mouseDrag',
              'mouseUp',
              'updateWordToDraw',
              'clearWordToDraw',
              'reset',
              'enable',
              'disable',
              'resetAndEnable',
              'handleFreeDraw',
              'handleDrawEnable',
              'sendNewPoints',
              'handleNewPoints',
              'handleCompletedPath',
              'debug');

    this.setupPaperCanvas();
    this.canvas = this.$('#gameBoard');
    this.wordToDrawEl = this.$('.wordToDraw');
    this.on('boardView:drawEnabled', this.handleDrawEnable);
  },

  drawSleep: false,

  drawSleepDuration: 50,

  // Placeholder for timeout object to buffer drawing.
  drawSleepTimeout: undefined,

  // Placeholder for interval object to buffer sending points.
  sendPointsInterval: undefined,

  currUserPathPoints: [],

  // Hash of other players' paths.
  paths: {},

  createNewPath: function () {
    var path = new Path(); // create a new path
    path.strokeColor = '#000';
    return path;
  },

  events: {
    'click .clearBtn': 'clearBoard',
    'click .debug': 'debug'
  },

  doClear: function() {
    this.path = new Path.Rectangle(new Point(0, 0), view.viewSize);
    this.path.fillColor = '#fff';
    view.draw();
  },

  clearBoard: function() {
    this.doClear();
    this.trigger('boardView:clearBoard', { 'eventName': 'clearBoard' });
  },

  doDrawSleep: function () {
    var _this = this;
    this.drawSleep = true;
    this.drawSleepTimeout = window.setTimeout(function () {
      _this.drawSleep = false;
    }, this.drawSleepDuration);
  },

  mouseDown: function(evt) {
    if (!this.drawSleep && this.enabled) {
      if (!this.path) {
        this.path = new Path();
      }

      this.path = this.createNewPath();
      this.path.add(evt.point);
      this.currUserPathPoints.push(evt.point);

      this.doDrawSleep();
    }
  },

  mouseDrag: function(evt) {
    if (!this.drawSleep && this.enabled && this.path) {
      this.path.add(evt.point);
      this.currUserPathPoints.push(evt.point);
      this.doDrawSleep();
    }
  },

  mouseUp: function(evt) {
    var lastPoints = this.currUserPathPoints;
    this.currUserPathPoints = [];

    if (this.enabled && this.path) {
      this.path.simplify(10);
      this.trigger('boardView:completedPath', { 'eventName': 'completedPath',
                                                'data': lastPoints });
    }
  },

  handleNewStroke: function(segments) {
    this.path = new Path(segments);
    this.path.strokeColor = '#000';
    view.draw();
  },

  setupPaperCanvas: function() {
    // using the global paper object
    view.draw();

    this.tool = new Tool();

    this.tool.onMouseDown = this.mouseDown;
    this.tool.onMouseDrag = this.mouseDrag;
    this.tool.onMouseUp   = this.mouseUp;
  },

  updateWordToDraw: function(word) {
    this.wordToDrawEl.find('.word').text(word);
    this.wordToDrawEl.show();
  },

  clearWordToDraw: function() {
    this.wordToDrawEl.find('.word').text('');
    this.wordToDrawEl.hide();
  },

  reset: function() {
    this.doClear();
    this.clearWordToDraw();
    this.enabled = false;
  },

  enable: function() {
    this.enabled = true;
    this.trigger('boardView:drawEnabled', true);
  },

  disable: function() {
    this.enabled = false;
    this.trigger('boardView:drawEnabled', false);
  },

  resetAndEnable: function() {
    this.reset();
    this.enable();
  },

  handleFreeDraw: function(flag) {
    this.enabled = flag;
    this.trigger('boardView:drawEnabled', flag);
  },

  handleDrawEnable: function(on) {
    if (on) {
      // Start interval to send path segments
      console.log('intiializing interval');
      this.sendPointsInterval = window.setInterval(this.sendNewPoints, 100);
    }
    else {
      // Clear interval
      console.log('clearing interval');
      window.clearInterval(this.sendPointsInterval);
    }
  },

  handleCompletedPath: function (data) {
    var senderId, points;

    if (!data) {
      console.log('[ERR] handleCompletedPath: no data');
      return;
    }

    // Draw the last remaining points
    this.handleNewPoints(data, false);

    senderId = data.senderId;
    if (senderId) {
      this.paths[senderId].simplify(10);
      this.paths[senderId] = null;
    }
    view.draw();
  },

  handleNewPoints: function (data, draw) {
    var senderId, points;

    // default draw to true
    draw = typeof draw === 'undefined' ? 'true' : draw;

    if (!data) { return; }
    senderId = data.senderId,
    points = data.points;

    if (!senderId || !points || !points.length) { return; }

    if (!this.paths[senderId]) {
      this.paths[senderId] = this.createNewPath();
    }
    this.paths[senderId].addSegments(points);
    if (draw) { view.draw(); }
  },

  sendNewPoints: function () {
    var points = this.currUserPathPoints;
    if (points.length) {
      // We have new points to send.
      this.currUserPathPoints = [];
      this.trigger('boardView:sendPoints', { 'eventName': 'newPoints',
                                             'data': points });
    }
  },

  debug: function() {
    this.trigger('boardView:debug');
  }
});
