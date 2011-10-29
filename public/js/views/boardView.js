var BoardView = Backbone.View.extend({
  initialize: function() {
    paper.install(window);
    paper.setup(document.getElementById('gameBoard'));

    _.extend(this, Backbone.Events);
    _.bindAll(this,
              'clearBoard',
              'mouseDown',
              'mouseDrag',
              'mouseUp',
              'canDraw');

    this.setupPaperCanvas();
    this.canvas = this.$('#gameBoard');
  },

  events: {
    'click .clear': 'clearBoard'
  },

  clearBoard: function() {
    this.path = new Path.Rectangle(new Point(0, 0), view.viewSize);
    this.path.fillColor = '#fff';
    view.draw();
  },

  mouseDown: function(evt) {
    if (this.canDraw()) {
      if (!this.path) {
        this.path = new Path();
      }
      this.path = new Path();
      this.path.strokeColor = '#000';
      this.path.add(evt.point);
    }
  },

  mouseDrag: function(evt) {
    if (this.canDraw() && this.path) {
      this.path.add(evt.point);
    }
  },

  mouseUp: function(evt) {
    var segment, segments = [];
    if (this.canDraw() && this.path) {
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

  canDraw: function() {
    return this.model.get('boardEnabled');
  }
});
