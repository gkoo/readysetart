// TODO: clear the board when someone makes a correct guess

var BoardView = Backbone.View.extend({
  initialize: function(o) {
    paper.install(window); // Injects the paper scope into the window scope. Maybe should revisit this.
    paper.setup(document.getElementById('gameBoard'));

    _.extend(this, Backbone.Events);
    _.bindAll(this,
              'doClear',
              'changeColor',
              'doDrawSleep',
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
              'handleInitPaths');

    this.setupPaperCanvas();
    this.canvas = this.$('#gameBoard');
    this.wordToDrawEl = this.$('.wordToDraw');
    this.bind('boardView:drawEnabled', this.handleDrawEnable);
    this.handleFreeDraw(o); // check if we are in freeDraw mode
  },

  simplifyLevel: 10,

  drawSleep: false,

  drawSleepDuration: 50,

  // Placeholder for timeout object to buffer drawing.
  drawSleepTimeout: undefined,

  // Placeholder for interval object to buffer sending points.
  sendPointsInterval: undefined,

  currUserPathPoints: [],

  // Hash of other players' paths.
  paths: {},

  brushColor: '#000',

  colors: {
    'black': '#000',
    'brown': '#8B4513',
    'blue': '#00f',
    'green': '#0f0',
    'red': '#f00',
    'yellow': '#ff0',
    'white': '#fff'
  },

  createNewPath: function (opt) {
    var path = new Path(),
        color = this.brushColor;

    if (opt && opt.color) {
      color = opt.color;
    }

    path.strokeColor = color;
    return path;
  },

  events: {
    'click #clearBoard': 'doClear',
    'click .color:': 'changeColor'
  },

  doClear: function() {
    this.path = new Path.Rectangle(new Point(0, 0), view.viewSize);
    this.path.fillColor = '#fff';
    view.draw();
    this.trigger('boardView:clear', { 'eventName': 'clearBoard' });
  },

  changeColor: function (evt) {
    var target = $(evt.target),
        colorLabel = target.attr('data-color');

    evt.preventDefault();
    if (colorLabel && this.colors[colorLabel]) {
      this.brushColor = this.colors[colorLabel];
    }
    else {
      this.brushColor = '#000';
    }

    this.trigger('boardView:changeColor', { 'eventName': 'changeColor',
                                            'data': this.brushColor });
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
      this.path.simplify(this.simplifyLevel);
      this.trigger('boardView:completedPath', { 'eventName': 'completedPath',
                                                'data': lastPoints });
    }
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
    this.doClear();
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

  handleFreeDraw: function(o) {
    var freeDraw, found = false;
    if (typeof o === 'object') {
      if (o.data) {
        freeDraw = o.data.freeDraw;
        found = true;
      }
      else if (o.freeDraw) {
        freeDraw = o.freeDraw;
        found = true;
      }
    }
    if (!found) {
      return;
    }
    this.enabled = freeDraw;
    this.trigger('boardView:drawEnabled', freeDraw);
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
    if (data.points) {
      this.handleNewPoints(data, false);
    }

    senderId = data.senderId;
    if (senderId) {
      this.paths[senderId].simplify(this.simplifyLevel);
      this.paths[senderId] = null;
    }
    view.draw();
  },

  handleNewPoints: function (data, draw) {
    var senderId, points;

    // default draw to true
    // draw says whether we should redraw the path.
    draw = typeof draw === 'undefined' ? 'true' : draw;

    if (!data) { return; }
    senderId = data.senderId,
    points = data.points;

    if (!senderId || !points || !points.length) { return; }

    if (!this.paths[senderId]) {
      this.paths[senderId] = this.createNewPath(data);
    }
    this.paths[senderId].addSegments(points);

    // don't remember why we wouldn't want to draw this.
    // i think it had to do with a few remaining points
    // captured after the mouse button is released?
    if (draw) { view.draw(); }
  },

  handleInitPaths: function (paths) {
    var i, len, pathObj, path;
    for (i = 0, len = paths.length; i<len; ++i) {
      pathObj = paths[i];
      path = this.createNewPath(pathObj);
      path.addSegments(pathObj.points);
      path.simplify(this.simplifyLevel);
    }
    view.draw();
  },

  sendNewPoints: function () {
    var points = this.currUserPathPoints;
    if (points.length) {
      // We have new points to send.
      this.currUserPathPoints = [];
      this.trigger('boardView:sendPoints', { 'eventName': 'newPoints',
                                             'data': points });
    }
  }
});
