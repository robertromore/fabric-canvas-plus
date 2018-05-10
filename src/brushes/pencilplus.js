fabric.BetterPencilBrush = fabric.util.createClass(fabric.PencilBrush, /** @lends fabric.PencilBrush.prototype */ {
  initialize: function(canvas) {
    this.canvas = canvas;
    this._lines = {0:[]};
    this._lineIndex = 0;
    this._cursorOnCanvas = false;
  },
  onMouseDown: function(pointer) {
    console.log(pointer)
    this._cursorOnCanvas = !this._isOffCanvas(pointer);
    if (!this._cursorOnCanvas) {
      return;
    }

    if (this._prepareForDrawing(pointer) && this._captureDrawingPath(pointer)) {
      this._render();
    }
  },
  onMouseMove: function(pointer) {
    var wasOnCanvas = this._cursorOnCanvas;
    this._cursorOnCanvas = !this._isOffCanvas(pointer);
    if (this._cursorOnCanvas && !wasOnCanvas) {
      if (this._lines[this._lineIndex].length > 0) {
        this._lines[++this._lineIndex] = new Array();
        this._prepareForDrawing(pointer) && this._captureDrawingPath(pointer);
      }
      this.oldEnd = pointer;
    }
    else if (!this._cursorOnCanvas) {
      return;
    }

    if (this._captureDrawingPath(pointer)) {
      var ctx = this.canvas.contextTop, points = this._lines[this._lineIndex], length = points.length;
      if (length <= 1) {
        return;
      }

      this._saveAndTransform(ctx);
      if (this.oldEnd) {
        ctx.beginPath();
        ctx.moveTo(this.oldEnd.x, this.oldEnd.y);
      }
      this.oldEnd = this._drawSegment(ctx, points[length - 2], points[length - 1]);
      ctx.stroke();
      ctx.restore();
    }
  },
  onMouseUp: function() {
    this.oldEnd = undefined;
    if (this._lines[this._lineIndex].length > 0) {
      this._finalizeAndAddPath();
    }
  },
  _prepareForDrawing: function(pointer) {
    var p = new fabric.Point(pointer.x, pointer.y);
    if (this._addPoint(p)) {
      this.canvas.contextTop.moveTo(p.x, p.y);
      return true;
    }
    else {
      return false;
    }
  },
  _addPoint: function(point) {
   if (this._isOffCanvas(point)) {
      return false;
    }

    var points = this._lines[this._lineIndex];
    if (points.length > 1 && point.eq(points[points.length - 1])) {
      return false;
    }

    points.push(point);
    return true;
  },
  _saveAndTransform: function(ctx) {
    var v = this.canvas.viewportTransform;
    ctx.save();
    ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
  },
  _reset: function() {
    this._lines = {0:[]};
    this._lineIndex = 0;
    this._setBrushStyles();
    this._setShadow();
  },
  _render: function() {
    var ctx  = this.canvas.contextTop, i, len;
    var points, p1, p2;
    this._saveAndTransform(ctx);
    for (var line in this._lines) {
      points = this._lines[line];
      p1 = points[0];
      p2 = points[1];

      ctx.beginPath();
      //if we only have 2 points in the path and they are the same
      //it means that the user only clicked the canvas without moving the mouse
      //then we should be drawing a dot. A path isn't drawn between two identical dots
      //that's why we set them apart a bit
      if (points.length === 2 && p1.x === p2.x && p1.y === p2.y) {
        var width = this.width / 1000;
        p1 = new fabric.Point(p1.x, p1.y);
        p2 = new fabric.Point(p2.x, p2.y);
        p1.x -= width;
        p2.x += width;
      }
      ctx.moveTo(p1.x, p1.y);

      for (i = 1, len = points.length; i < len; i++) {
        // we pick the point between pi + 1 & pi + 2 as the
        // end point and p1 as our control point.
        this._drawSegment(ctx, p1, p2);
        p1 = points[i];
        p2 = points[i + 1];
      }
      // Draw last line as a straight line while
      // we wait for the next point to be able to calculate
      // the bezier control point
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    ctx.restore();
  },
  _finalizeAndAddPath: function() {
    var ctx = this.canvas.contextTop;
    ctx.closePath();

    var points = [];
    var pathData;
    var path;
    for (var line in this._lines) {
      points = this._lines[line];
      pathData = this.convertPointsToSVGPath(points).join('');
      if (pathData === 'M 0 0 Q 0 0 0 0 L 0 0') {
        // do not create 0 width/height paths, as they are
        // rendered inconsistently across browsers
        // Firefox 4, for example, renders a dot,
        // whereas Chrome 10 renders nothing
        this.canvas.requestRenderAll();
        return;
      }

      path = this.createPath(pathData);
      this.canvas.clearContext(this.canvas.contextTop);
      this.canvas.add(path);
      this.canvas.renderAll();
      path.setCoords();
    }

    this._resetShadow();
    this._reset();

    // fire event 'path' created
    this.canvas.fire('path:created', { path: path });
  }
});
