// TODO: clear the board when someone makes a correct guess

var BoardView = Backbone.View.extend({
  initialize: function() {
    try {
      paper.install(window);
      paper.setup(document.getElementById('gameBoard'));

      _.extend(this, Backbone.Events);
      _.bindAll(this,
                'doClear',
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
                'debug');

      this.setupPaperCanvas();
      this.canvas = this.$('#gameBoard');
      this.wordToDrawEl = this.$('.wordToDraw');
    }
    catch(e) {
      console.log(e);
    }
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
    this.trigger('clearBoard');
  },

  mouseDown: function(evt) {
    if (this.enabled) {
      if (!this.path) {
        this.path = new Path();
      }
      this.path = new Path();
      this.path.strokeColor = '#000';
      this.path.add(evt.point);
    }
  },

  mouseDrag: function(evt) {
    if (this.enabled && this.path) {
      this.path.add(evt.point);
    }
  },

  mouseUp: function(evt) {
    var segment, segments = [];
    if (this.enabled && this.path) {
      this.path.simplify(10);
      for (var i=0,len=this.path.segments.length; i<len; ++i) {
        tmpSegment = this.path.segments[i];
        segment = { 'point':      [tmpSegment.point.x, tmpSegment.point.y],
                    'handleIn':   [tmpSegment.handleIn.x, tmpSegment.handleIn.y],
                    'handleOut':  [tmpSegment.handleOut.x, tmpSegment.handleOut.y] };

        segments.push(segment);
      }
      this.trigger('newStrokePub', segments);
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
  },

  disable: function() {
    this.enabled = false;
  },

  resetAndEnable: function() {
    this.reset();
    this.enable();
  },

  debug: function() {
    this.trigger('debug');
  }
});
