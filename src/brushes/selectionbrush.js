fabric.SelectionBrush = fabric.util.createClass(fabric.BaseBrush, /** @lends fabric.SelectionBrush */ {
  initialize: function(canvas) {
    this.canvas = canvas;
    this._pointSets = [[]];
    this._currentPointSet = 0;

    // Used for marching ants.
    this._timeout = 0;
    this._offset = 0;
    this._mouseDragTimeout = null;

    this.strokeLineCap = 'butt';
    this.strokeLineJoin = 'miter';
    this.strokeDashArray = [5, 5];

    this.currentMode = 'add'; // 'add', 'remove', 'intersect'
  },
  replaceLastPoint: function(point) {
    this._pointSets[this._currentPointSet][this._pointSets[this._currentPointSet].length - 1] =
    {
      mode: this.currentMode + '',
      point: new fabric.Point(
        Math.max(0, Math.min(this.canvas.subcanvas.width, point.x)),
        Math.max(0, Math.min(this.canvas.subcanvas.height, point.y))
      )
    };
  },
  addPoint: function(point, reset) {
    if (reset && this._pointSets[this._currentPointSet].length > 0) {
      this._currentPointSet = this._pointSets.push([]) - 1;
    }

    this._pointSets[this._currentPointSet].push({
      mode: this.currentMode + '',
      point: new fabric.Point(
        Math.max(0, Math.min(this.canvas.subcanvas.width, point.x)),
        Math.max(0, Math.min(this.canvas.subcanvas.height, point.y))
      )
    });
  },
  onMouseDown: function(pointer) {
    if (typeof pointer == 'undefined') {
      return;
    }

    this._setBrushStyles();
    this._timeout = 0;
    this._offset = 0;

    this.addPoint(pointer, true);
  },
  onMouseMove: function(pointer) {
    if (typeof pointer == 'undefined') {
      return;
    }

    if (this._pointSets[this._currentPointSet].length <= 1) {
      this.addPoint(pointer);
      this._render();
    }
    else {
      this.replaceLastPoint(pointer);
    }
  },
  onMouseUp: function(pointer) {
    // this._render();

    // Remove any pointsets that are completely inside this new pointset.
    

    // Merge any pointsets intersecting this new pointset together into one new
    // pointset.
  },
  clear: function() {
    this._currentPointSet = [];
    this._pointsets = [];
    this._setBrushStyles();
    this._setShadow();
  },
  _animate: function(ctx) {
    this.canvas.clearContext(ctx);
    clearTimeout(this._timeout);
    this._saveAndTransform(ctx);

    var z = this.canvas.getZoom();
    ctx.lineWidth = 1 / z;
    if (z > 1) {
      ctx.setLineDash([this.strokeDashArray[0] / z, this.strokeDashArray[1] / z]);
    }
    ctx.lineDashOffset = -this._offset++ / z;

    for (var pointset in this._pointSets) {
      if (this._pointSets[pointset].length <= 1) {
        continue;
      }
      this.drawPath(ctx, this._pointSets[pointset]);
    }

    for (var pointset in this._pointSets) {
      if (this._pointSets[pointset].length <= 1) {
        continue;
      }
      this.clearInsidePath(ctx, this._pointSets[pointset]);
    }

    var t = this;
    this._timeout = setTimeout(function() {
      fabric.util.requestAnimFrame(function() {
        if (t._offset > 30) {
          t._offset = 0;
        }
        t._animate(ctx);
      });
    }, 30);
    ctx.restore();
  },
  drawPath: function(ctx, points) {
    ctx.moveTo(this._pointSets[pointset][this._pointSets[pointset].length - 1].x, this._pointSets[pointset][this._pointSets[pointset].length - 1].y);
    for (var point in this._pointsets[pointset]) {
      ctx.lineTo(this._pointSets[pointset][point].point.x, this._pointSets[pointset][point].point.y);
    }
    ctx.stroke();
  },
  clearInsidePath: function(ctx, points) {
  },
  _render: function() {
    var ctx = this.canvas.contextTop;
    this._animate(ctx);
  }
});
