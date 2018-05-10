var transparentBackgroundData = new Image();
transparentBackgroundData.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iI2ZmZiI+PC9yZWN0Pgo8cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNGN0Y3RjciPjwvcmVjdD4KPHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNGN0Y3RjciPjwvcmVjdD4KPC9zdmc+';
var transparentBackgroundDataPattern = null;

var zeroPoint = function() {
  return new fabric.Point(0, 0);
};

var onePoint = function() {
  return new fabric.Point(1, 1);
};

var propExists = function(obj, prop) {
  return typeof obj[prop] !== 'undefined';
};

var isset = function(obj, prop) {
  return propExists(obj, prop) && obj[prop] !== false && obj[prop] !== null;
};

fabric.BaseBrush.prototype._isOffCanvas = function(pointer) {
  return pointer.x < 0 || pointer.y < 0 || pointer.x > this.canvas.subcanvas.width || pointer.y > this.canvas.subcanvas.height;
};
