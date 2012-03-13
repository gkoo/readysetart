// TODO: clear the board when someone makes a correct guess

var BoardView = Backbone.View.extend({
  initialize: function(o) {
    paper.install(window); // Injects the paper scope into the window scope. Maybe should revisit this.
    paper.setup(document.getElementById('gameBoard'));

    _.extend(this, Backbone.Events);
    _.bindAll(this,
              'doClearAndBroadcast',
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
              'handleInitPaths',
              'doNextUpInterval',
              'handleNextUp',
              'handleGameFinished');

    this.setupPaperCanvas();
    this.canvas = this.$('#gameBoard');
    this.$wordToDrawEl = this.$('.wordToDraw');
    this.$yourColorEl = this.$('#yourColor');
    this.$nextUpEl = this.$('#nextUpMessage');
    this.$boardControls = this.$('#boardControls');
    this.bind('boardView:drawEnabled', this.handleDrawEnable);
    this.handleFreeDraw(o); // check if we are in freeDraw mode
  },

  simplifyLevel: 10,

  drawSleep: false,

  drawSleepDuration: 50,

  // Placeholder for timeout object to buffer drawing.
  drawSleepTimeout: undefined,

  nextUpInterval: undefined,

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
    'yellow': '#ee0',
    'white': '#fff'
  },

  createNewPath: function (opt) {
    var path = new Path(),
        color = this.brushColor;

    if (opt && opt.color) {
      color = opt.color;
    }

    path.strokeColor = color;
    path.strokeWidth = 5;
    return path;
  },

  events: {
    'click #clearBoard': 'doClearAndBroadcast',
    'click a.color:': 'changeColor'
  },

  doClearAndBroadcast: function () {
    this.doClear();
    this.trigger('boardView:clear', { 'eventName': 'clearBoard' });
  },

  doClear: function() {
    this.path = new Path.Rectangle(new Point(0, 0), view.viewSize);
    this.path.fillColor = '#fff';
    view.draw();
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

    this.$yourColorEl.children('.color').removeClass()
                                        .addClass('color ' + colorLabel);

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
    if (word) {
      this.$wordToDrawEl.find('.word').text(word);
      this.$wordToDrawEl.show();
    }
    else {
      this.$wordToDrawEl.hide();
    }
  },

  clearWordToDraw: function() {
    this.$wordToDrawEl.find('.word').text('');
    this.$wordToDrawEl.hide();
  },

  reset: function() {
    this.doClear();
    this.clearWordToDraw();
    this.enabled = false;
  },

  enable: function() {
    this.enabled = true;
    this.$boardControls.show();
    this.trigger('boardView:drawEnabled', true);
  },

  disable: function() {
    this.enabled = false;
    this.$boardControls.hide();
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
      else if (typeof o.freeDraw !== 'undefined') {
        freeDraw = o.freeDraw;
        found = true;
      }
    }
    if (!found) { return; }

    if (freeDraw) { this.enable(); }
    else { this.disable(); }
  },

  handleDrawEnable: function(on) {
    if (on) {
      // Start interval to send path segments
      this.sendPointsInterval = window.setInterval(this.sendNewPoints, 100);
    }
    else {
      // Clear interval
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

  handleGameFinished: function () {
    this.updateWordToDraw();
    this.disable();
  },

  doNextUpInterval: function() {
    var secondsEl = this.$nextUpEl.find('.seconds'),
        secondsLeft = parseInt(secondsEl.text(), 10);

    if (--secondsLeft === 0) {
      clearInterval(this.nextUpInterval);
      this.$nextUpEl.hide();
    }
    else {
      secondsEl.text(secondsLeft);
    }
  },

  handleNextUp: function(data) {
    var el = this.$nextUpEl,
        nextArtist = this.getPlayerById(data.currArtist);

    this.disable();
    el.find('.playerName').text(nextArtist.get('name'));
    // TODO: change to use value from model.
    el.find('.seconds').text('5');
    el.show();
    this.nextUpInterval = setInterval(this.doNextUpInterval, 1000);
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
