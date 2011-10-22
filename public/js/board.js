var BoardModel = Backbone.Model.extend(),
    BoardView,
    segments;

paper.install(window);
paper.setup(document.getElementById('gameBoard'));

BoardView = Backbone.View.extend({
  el: $('.content'),
  initialize: function() {
    this.canvas = this.$('#gameBoard');
    _.bindAll(this,
              'clearBoard',
              'mouseDown',
              'mouseDrag',
              'mouseUp');
    this.setupPaperCanvas();
  },

  events: {
    'click .clear': 'clearBoard',
    'click .redraw': 'doRedraw'
  },

  clearBoard: function() {
    this.path = new Path.Rectangle(new Point(0, 0), view.viewSize);
    this.path.fillColor = '#fff';
    view.draw();
  },

  /*
  doRedraw: function() {
    if (segments) {
      this.path = new Path(segments);
      this.path.strokeColor = '#000'
      view.draw();
    }
  },
  */

  mouseDown: function(evt) {
    if (!this.path) {
      this.path = new Path();
    }
    this.path = new Path();
    this.path.strokeColor = '#000';
    this.path.add(evt.point);
  },

  mouseDrag: function(evt) {
    if (this.path) {
      this.path.add(evt.point);
    }
  },

  mouseUp: function(evt) {
    this.path.simplify(10);
    segments = this.path.segments;
  },

  setupPaperCanvas: function() {
    // using the global paper object
    view.draw();

    this.tool = new Tool();

    console.log('registering mousedown');
    this.tool.onMouseDown = this.mouseDown;
    this.tool.onMouseDrag = this.mouseDrag;
    this.tool.onMouseUp   = this.mouseUp;
  }
});
