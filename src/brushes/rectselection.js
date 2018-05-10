fabric.RectSelectionBrush = fabric.util.createClass(fabric.SelectionBrush, /** @lends fabric.SelectionBrush */ {
  drawPath: function(ctx, points) {
    var min = points[0].point.min(points[1].point);
    var max = points[0].point.max(points[1].point);

    var x = min.x;
    var y = min.y;
    var w = max.x - x;
    var h = max.y - y;
    ctx.strokeRect(x, y, w, h);
  },
  clearInsidePath: function(ctx, points) {
    var min = points[0].point.min(points[1].point);
    var max = points[0].point.max(points[1].point);

    var x = min.x + (ctx.lineWidth / 2);
    var y = min.y + (ctx.lineWidth / 2);
    var w = max.x - x - (ctx.lineWidth / 2);
    var h = max.y - y - (ctx.lineWidth / 2);
    ctx.clearRect(x, y, w, h);
  },
});
