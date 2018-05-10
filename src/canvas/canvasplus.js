fabric.CanvasPlus = fabric.util.createClass(
  fabric.Canvas, /** @lends fabric.CanvasPlus.prototyoe */ {
    type: 'CanvasPlus',

    initialize: function(el, options) {
      var t = this;

      var defaults = {
        isDrawingMode: true,
        interactive: true,
        imageSmoothingEnabled: false,
        enableRetinaScaling: true,
        width: this.width,
        height: this.height,
        skipOffscreen: false,
        subcanvas: {
          width: 100,
          height: 100,
          backgroundColor: 'transparent',
          enableRotation: true,
          angle: 0
        },
        grid: {
          mode: 'automatic', // 'automatic', 'manual', or a false value to disable
          spacing: 64,
          subdivisions: 4,
          lines: {
            grid: {
              size: 1.5,
              strokeStyle: 'rgba(255, 255, 255, .25)'
            },
            subdivision: {
              size: 1,
              strokeStyle: 'rgba(255, 255, 255, .1)'
            }
          }
        },
        rulers: {
          defaults: {
            enabled: true,
            // @todo support
            // mode: 'automatic', // 'automatic', 'static', 'disabled'
            // alternatively
            // style: 'abovecenterprimary', 'adjacentprimary'
            position: zeroPoint(),
            width: options.width,
            height: 30,
            rotate: 0,
            backgroundColor: 'rgba(0, 0, 0, .5)',
            alignment: 'bottom',
            cursor: {
              enabled: true,
              width: 1,
              height: 30,
              lineWidth: 1,
              strokeStyle: 'rgba(204, 204, 204, 1)',
              axis: 'x',
              _pos: zeroPoint()
            },
            labels: {
              enabled: true,
              useParentTransform: true,
              rotation: 0,
              rotateOrigin: zeroPoint(),
              translate: zeroPoint(),
              scale: onePoint(),
              color: 'rgba(255, 255, 255, 1)',
              font: '10px Verdana',
              position: zeroPoint()
            },
            lines: {
              width: 1,
              color: 'rgba(255, 255, 255, 1)',
              sizes: {
                large: .6,
                medium: .8,
                small: .9
              }
            },
            unitDisplay: {
              enable: true,
              position: new fabric.Point(0, 0),
              width: 'automatic',
              height: 'automatic',
              backgroundColor: 'rgba(0, 0, 0, .2)',
              font: '10px Verdana',
              fontColor: 'white'
            },
            _vptIndice: 4,
            _vptProp: 'width',
            _vptZoomIndice: 0,
            _canvas: null,
            _ctx: null
          },
          top: {
            position: new fabric.Point(30, 0),
            labels: {
              position: new fabric.Point(0, 14)
            }
          },
          left: {
            width: 30,
            height: options.height,
            position: new fabric.Point(0, 0),
            alignment: 'right',
            cursor: {
              width: 30,
              height: 1,
              axis: 'y'
            },
            labels: {
              rotate: -Math.PI / 2,
              position: new fabric.Point(0, 14)
            },
            _vptIndice: 5,
            _vptProp: 'height',
            _vptZoomIndice: 3
          },
          bottom: {
            enabled: false,
            position: new fabric.Point(0, options.height - 30),
            width: options.width,
            alignment: 'top',
            labels: {
              position: new fabric.Point(0, 24)
            }
          },
          right: {
            enabled: false,
            width: 30,
            height: options.height,
            position: new fabric.Point(options.width - 30, 0),
            alignment: 'left',
            cursor: {
              width: 30,
              height: 1,
              axis: 'y'
            },
            labels: {
              rotate: Math.PI / 2,
              position: new fabric.Point(0, -16)
            },
            _vptIndice: 5,
            _vptProp: 'height',
            _vptZoomIndice: 3
          },
        },
        zoom: {
          max: 2000000,
          min: .001,
          rate: 100,
          mode: 'progressive' // 'progressive', 'linear'
        },
        units: {
          type: 'px',
          display: {
            enabled: true,
            width: 30,
            height: 30,
            position: new fabric.Point(0, 0),
            backgroundColor: 'rgba(0, 0, 0, .5)',
            fontColor: 'rgba(255, 255, 255, 1)',
            font: '10px Verdana'
          }
        }
      };

      // Merge the default settings with the options passed.
      options = _.assignIn({}, defaults, options);

      var rulersEnabled = !propExists(options.rulers, 'enabled') || isset(options.rulers, 'enabled');
      // Merge the default ruler settings with each ruler.
      if (rulersEnabled) {
        for (var ruler in options.rulers) {
          if (ruler == 'defaults') {
            continue;
          }
          options.rulers[ruler] = _.merge({}, options.rulers.defaults, options.rulers[ruler]);
        }
      }

      // Ensure rulers don't overlap each other.
      if (isset(options.rulers.top, 'enabled')) {
        if (isset(options.rulers.left, 'enabled')) {
          options.rulers.left.position.y += options.rulers.top.height + options.rulers.top.position.y;
          options.rulers.left.height -= options.rulers.top.height;
        }
        if (isset(options.rulers.right, 'enabled')) {
          options.rulers.right.position.y += options.rulers.top.height + options.rulers.top.position.y;
          options.rulers.right.height -= options.rulers.top.height;
        }
      }

      if (isset(options.rulers.bottom, 'enabled')) {
        if (isset(options.rulers.left, 'enabled')) {
          options.rulers.left.height -= options.rulers.bottom.height;
        }
        if (isset(options.rulers.right, 'enabled')) {
          options.rulers.right.height -= options.rulers.bottom.height;
        }
      }

      if (rulersEnabled) {
        for (var ruler in options.rulers) {
          // Create a canvas for each ruler so we don't continually recalculate
          // when rendering if it's not needed.
          if (!propExists(options.rulers[ruler], 'enabled') || isset(options.rulers[ruler], 'enabled')) {
            options.rulers[ruler]._canvas = document.createElement('canvas');
            options.rulers[ruler]._canvas.width = options.rulers[ruler].width * fabric.devicePixelRatio;
            options.rulers[ruler]._canvas.height = options.rulers[ruler].height * fabric.devicePixelRatio;
            options.rulers[ruler]._canvas.style.width = options.rulers[ruler].width + 'px';
            options.rulers[ruler]._canvas.style.height = options.rulers[ruler].height + 'px';
            options.rulers[ruler]._ctx = options.rulers[ruler]._canvas.getContext('2d');
            options.rulers[ruler]._ctx.scale(fabric.devicePixelRatio, fabric.devicePixelRatio);
          }
        }
      }

      this.callSuper('initialize', el, options);

      // Use a fabric.Rect object to represent the subcanvas.
      this.subcanvas = new fabric.Rect(_.merge(this.subcanvas, { canvas: this }));
      this.subcanvas.setCoords();

      this.panningBounds = this.calcViewportPanningBoundaries();

      var vpt = this.viewportTransform.slice(0);

      // Center the viewport around the center of the subcanvas.
      // First determine if the subcanvas dimensions are larger than the
      // screen dimensions.
      if (this.subcanvas.width > this.width || this.subcanvas.height > this.height) {
        // Calculate the offset from the rulers dimensions.
        var x = 0;
        var y = 0;
        if (rulersEnabled) {
          for (ruler in this.rulers) {
            if (ruler == 'defaults' || !propExists(this.rulers[ruler], 'enabled') || !isset(this.rulers[ruler], 'enabled')) {
              continue;
            }
            if (this.rulers[ruler]._vptIndice == 4) {
              y += this.rulers[ruler].height;
            }
            if (this.rulers[ruler]._vptIndice == 5) {
              x += this.rulers[ruler].width;
            }
          }
        }

        var scale = Math.min((this.width - x * fabric.devicePixelRatio) / this.subcanvas.width, (this.height - y * fabric.devicePixelRatio) / this.subcanvas.height);
        this.setZoom(scale);
        var center = this.getVpCenter();
        vpt = this.viewportTransform;
        vpt[4] = (center.x + x) * scale - ((this.subcanvas.width * scale) / 2);
        vpt[5] = (center.y + y) * scale - ((this.subcanvas.height * scale) / 2);
      }
      else {
        vpt[4] = this.width / 2 - this.subcanvas.width / 2;
        vpt[5] = this.height / 2 - this.subcanvas.height / 2;
      }
      this.setViewportTransform(vpt);

      this._internal = {
        // Flag used to determine when rulers need to be rerendered. Should be
        // set to true after panning or zooming.
        rulersNeedRecalc: true
      };

      // Use pinch-to-zoom to zoom in and out.
      // @todo Make this configurable, and when not set use scroll instead.
      fabric.util.addListener(t.wrapperEl, 'mousewheel', function(e) {
        if (e.ctrlKey) {
          var p = new fabric.Point(e.offsetX, e.offsetY);
          t.relativeZoomToPoint(p, e.deltaY);
        } else {
          // @todo make the direction inversion configurable.
          t.relativePan(new fabric.Point(-e.deltaX, -e.deltaY));
        }
        t._internal.rulersNeedRecalc = true;
      });

      // Reset the width and height of the canvas area and rulers when the
      // window is resized.
      /*fabric.util.addListener(window, 'resize', function(e) {
        t.set({
          width: t.parent.width(),
          height: t.parent.height()
        });

        for (var ruler in t.rulers) {
          if (ruler == 'defaults') {
            continue;
          }

          t.rulers[ruler][t.rulers[ruler]._vptProp] = t[t.rulers[ruler]._vptProp];
        }

        t.requestRenderAll();
      });*/

      fabric.util.addListener(t.wrapperEl, 'mousemove', function(e) {
        for (var ruler in t.rulers) {
          if (ruler == 'defaults') {
            continue;
          }

          if (isset(t.rulers[ruler].cursor, 'enabled')) {
            if (t.rulers[ruler].cursor.axis == 'x') {
              t.rulers[ruler].cursor._pos.x = e.offsetX;
            }
            else if (t.rulers[ruler].cursor.axis == 'y') {
              t.rulers[ruler].cursor._pos.y = e.offsetY;
            }
          }
        }
        // t.requestRenderAll();
      });

      // fabric.Image.fromURL('./img2.png', function(img) {
      //   t.add(img);
      // });

      // this.freeDrawingBrush = fabric.SprayBrush && new fabric.SprayBrush(this);
      // this.freeDrawingBrush = fabric.BetterPencilBrush && new fabric.BetterPencilBrush(this);
      this.freeDrawingBrush = fabric.RectSelectionBrush && new fabric.RectSelectionBrush(this);
    },

    getZoom: function() {
      if (this.viewportTransform[0] == this.viewportTransform[3]) {
        return this.viewportTransform[0];
      }

      return Math.max(this.viewportTransform[0], this.viewportTransform[3]);
    },

    relativeZoomToPoint: function(point, value) {
      var coords = this.panningBounds;
      var zoom = this.getZoom();

      var nextzoom = zoom + -value * (zoom / this.zoom.rate);
      if (nextzoom < this.zoom.min) {
        nextzoom = this.zoom.min;
      }
      else if (nextzoom > this.zoom.max) {
        nextzoom = this.zoom.max;
      }

      var before = point;
      var vpt = this.viewportTransform.slice(0);

      transformedPoint = fabric.util.transformPoint(
        point,
        fabric.util.invertTransform(vpt)
      );

      vpt[0] = nextzoom;
      vpt[3] = nextzoom;
      var after = fabric.util.transformPoint(transformedPoint, vpt);

      var w = this.subcanvas.width * nextzoom;
      var l = vpt[4] += before.x - after.x;
      var r = l + w;
      if (r <= coords.tl.x) {
        vpt[4] = coords.tl.x - w;
      } else if (l >= coords.tr.x) {
        vpt[4] = coords.tr.x;
      }

      var h = this.subcanvas.height * nextzoom;
      var t = vpt[5] += before.y - after.y;
      var b = t + h;
      if (b <= coords.tl.y) {
        vpt[5] = coords.tl.y - h;
      } else if (t >= coords.bl.y) {
        vpt[5] = coords.bl.y;
      }

      this.setViewportTransform(vpt);
    },

    relativePan: function(point) {
      var vpt = this.viewportTransform.slice(0);

      var x = vpt[4] += point.x;
      var y = vpt[5] += point.y;
      var coords = this.panningBounds;

      if (x < coords.tl.x - this.subcanvas.width * vpt[0]) {
        x = coords.tl.x - this.subcanvas.width * vpt[0];
      }
      else if (x > coords.tr.x) {
        x = coords.tr.x;
      }

      if (y < coords.tl.y - this.subcanvas.height * vpt[3]) {
        y = coords.tl.y - this.subcanvas.height * vpt[3];
      }
      else if (y > coords.br.y) {
        y = coords.br.y;
      }

      vpt[4] = x;
      vpt[5] = y;

      this.setViewportTransform(vpt);
    },

    calcViewportPanningBoundaries: function() {
      var points = {},
        width = this.width,
        height = this.height,
        center = new fabric.Point(this.subcanvas.width / 2, this.subcanvas.height / 2),
        a = fabric.util.degreesToRadians(this.subcanvas.angle);
      points.tl = new fabric.Point(
        Math.floor(width / 4),
        Math.floor(height / 4)
      );
      points.br = new fabric.Point(
        Math.floor(width - width / 4),
        Math.floor(height - height / 4)
      );
      points.tr = new fabric.Point(points.br.x, points.tl.y);
      points.bl = new fabric.Point(points.tl.x, points.br.y);

      // @todo Account for angle of subcanvas.

      return points;
    },

    _beforeClip: function(ctx) {
      var tx = this.subcanvas.width / 2;
      var ty = this.subcanvas.height / 2;
      var a = fabric.util.degreesToRadians(this.subcanvas.angle);
      ctx.translate(tx, ty);
      ctx.rotate(a);
      ctx.translate(-tx, -ty);
    },

    clipTo2: function(ctx) {
      ctx.rect(0, 0, this.subcanvas.width, this.subcanvas.height);
    },

    _afterClip: function(ctx) {
      var tx = this.subcanvas.width / 2;
      var ty = this.subcanvas.height / 2;
      var a = fabric.util.degreesToRadians(this.subcanvas.angle);
      ctx.translate(tx, ty);
      ctx.rotate(-a);
      ctx.translate(-tx, -ty);
    },

    _renderBackground: function(ctx) {
      ctx.save();
      var v = this.viewportTransform;

      // Move the viewport to the appropriate position without scaling so that
      // if the background color is transparent, the transparent background
      // doesn't scale as well.
      ctx.transform(1, v[1], v[2], 1, v[4], v[5]);

      var tx = this.subcanvas.width * v[0] / 2;
      var ty = this.subcanvas.height * v[3] / 2;
      ctx.translate(tx, ty);
      ctx.rotate(fabric.util.degreesToRadians(this.subcanvas.angle));
      ctx.translate(-tx, -ty);

      // If the background color is transparent, create a pattern based on the
      // transparent background image data variable and set the fill style to
      // use this pattern.
      if (this.subcanvas.backgroundColor == 'transparent') {
        if (!transparentBackgroundDataPattern) {
          transparentBackgroundDataPattern = ctx.createPattern(transparentBackgroundData, 'repeat');
        }
        ctx.fillStyle = transparentBackgroundDataPattern;
      }
      else {
        ctx.fillStyle = this.subcanvas.backgroundColor;
      }

      ctx.fillRect(0, 0, this.subcanvas.width * v[0], this.subcanvas.height * v[3]);
      ctx.restore();
    },

    _renderCursor: function(ctx, ruler) {
      ctx.save();
      ctx.lineWidth = ruler.cursor.lineWidth;
      ctx.strokeStyle = ruler.cursor.strokeStyle;
      ctx.beginPath();
      if (ruler.cursor.axis == 'x') {
        ctx.moveTo(ruler.cursor._pos.x, ruler.position.y + ruler.height - ruler.cursor.height);
        ctx.lineTo(ruler.cursor._pos.x, ruler.position.y + ruler.cursor.height);
      }
      else if (ruler.cursor.axis == 'y') {
        ctx.moveTo(ruler.position.x + ruler.width - ruler.cursor.width, ruler.cursor._pos.y);
        ctx.lineTo(ruler.position.x + ruler.cursor.width, ruler.cursor._pos.y);
      }
      ctx.stroke();
      ctx.restore();
    },

    _getRulerZoomIntervals: function() {
      var zoom = this.getZoom();
      var large = 100;
      var medium = 20;
      var small = 10;
      var step = 10;

      if (zoom < 0.005) {
        large = 50000;
        medium = 10000;
        small = 5000;
        step = 5000;
      }
      else if (zoom >= 0.005 && zoom < 0.01) {
        large = 10000;
        medium = 2000;
        small = 0;
        step = 2000;
        if (zoom >= 0.008) {
          small = 1000;
          step = 1000;
        }
      } else if (zoom >= 0.01 && zoom < 0.032) {
        large = 5000;
        medium = 1000;
        small = 0;
        step = 1000;
        if (zoom >= 0.016) {
          small = 500;
          step = 500;
        }
      } else if (zoom >= 0.032 && zoom < 0.05) {
        large = 5000;
        medium = 1000;
        small = 250;
        step = 250;
      } else if (zoom >= 0.05 && zoom < 0.1) {
        large = 1000;
        medium = 200;
        small = 0;
        step = 200;
        if (zoom >= 0.08) {
          small = 100;
          step = 100;
        }
      } else if (zoom >= 0.1 && zoom < 0.5) {
        large = 500;
        medium = 100;
        small = 0;
        step = 100;
        if (zoom >= 0.16 && zoom < 0.32) {
          small = 50;
          step = 50;
        } else if (zoom >= 0.32) {
          small = 25;
          step = 25;
        }
      } else if (zoom >= 0.5 && zoom < 0.8) {
        small = 0;
        step = 20;
      } else if (zoom >= 1.6 && zoom < 3.2) {
        small = 5;
        step = 5;
      } else if (zoom >= 3.2 && zoom < 5) {
        small = 2.5;
        step = 2.5;
      } else if (zoom >= 5 && zoom < 8) {
        large = 50;
        medium = 10;
        small = 2.5;
        step = 2.5;
        if (zoom >= 6.4) {
          small = 1;
          step = 1;
        }
      } else if (zoom >= 8 && zoom < 50) {
        large = 10;
        medium = 1;
        small = 0;
        step = 1;
        if (zoom >= 16 && zoom < 32) {
          small = 0.5;
          step = 0.5;
        } else if (zoom >= 32) {
          small = 0.25;
          step = 0.25;
        }
      } else if (zoom >= 50) {
        d = Math.floor(Math.log2(zoom / 1000)) + 2;
        large = step = 1 / Math.pow(2, d);
        medium = small = 0;
      }

      return { 'large': large, 'medium': medium, 'small': small, 'step': step };
    },

    _getRulerMinAmount: function(vptValue, zoom, step) {
      return Math.ceil(((-vptValue / zoom)) / step) * step;
    },

    _getRulerMaxAmount: function(vptValue, prop, zoom, step) {
      return Math.ceil((((prop - vptValue) / zoom)) / step) * step;
    },

    _renderRuler: function(ctx, ruler) {
      var vpt = this.viewportTransform;
      var rulerctx = ruler._ctx;

      var x = ruler.position.x;
      var y = ruler.position.y;
      var w = ruler.width;
      var h = ruler.height;

      if (this._internal.rulersNeedRecalc) {
        rulerctx.clearRect(0, 0, w, h);
        rulerctx.save();

        rulerctx.rect(0, 0, w, h);
        rulerctx.clip();

        rulerctx.fillStyle = ruler.backgroundColor;
        rulerctx.fill();

        var intervals = this._getRulerZoomIntervals();
        var large = intervals['large'];
        var medium = intervals['medium'];
        var small = intervals['small'];
        var step = intervals['step'];

        var zoom = vpt[ruler._vptZoomIndice];
        var min = this._getRulerMinAmount(vpt[ruler._vptIndice], zoom, step);
        var max = this._getRulerMaxAmount(vpt[ruler._vptIndice], this[ruler._vptProp], zoom, step);

        var reverseDirection = ruler.reverseDirection ? -1 : 1;

        var i;
        var drawLabel = false;
        var multiplier = 0;
        var pos;

        rulerctx.beginPath();
        for (i = min; i <= max; i += step) {
          if (large > 0 && i % large == 0) {
            multiplier = ruler.lines.sizes['large'];
            drawLabel = true;
          } else if (medium > 0 && i % medium == 0) {
            multiplier = ruler.lines.sizes['medium'];
          } else if (small > 0 && i % small == 0) {
            multiplier = ruler.lines.sizes['small'];
          } else {
            continue;
          }

          pos = i * zoom + vpt[ruler._vptIndice];

          if (ruler.alignment == 'bottom') {
            rulerctx.moveTo(pos - x, ruler.height * multiplier);
            rulerctx.lineTo(pos - x, ruler.height);
          }
          else if (ruler.alignment == 'top') {
            rulerctx.moveTo(pos - x, 0);
            rulerctx.lineTo(pos - x, ruler.height - ruler.height * multiplier);
          }
          else if (ruler.alignment == 'left') {
            rulerctx.moveTo(0, pos - y);
            rulerctx.lineTo(ruler.width - ruler.width * multiplier, pos - y);
          }
          else if (ruler.alignment == 'right') {
            rulerctx.moveTo(ruler.width * multiplier, pos - y);
            rulerctx.lineTo(ruler.width, pos - y);
          }
        }

        rulerctx.strokeStyle = ruler.lines.color;
        rulerctx.stroke();

        if (!ruler.labels.useParentTransform) {
          rulerctx.restore();
          rulerctx.save();
        }

        rulerctx.fillStyle = ruler.labels.color;
        rulerctx.font = ruler.labels.font;

        if (ruler.labels.rotate) {
          rulerctx.translate(ruler.labels.rotateOrigin.x, ruler.labels.rotateOrigin.y);
          rulerctx.rotate(ruler.labels.rotate);
        }

        for (i = min; i <= max; i += step) {
          if (i % large !== 0) {
            continue;
          }

          pos = i * zoom + vpt[ruler._vptIndice];
          var l = i.toString().split('.');
          text = i;
          if (l[1] !== undefined && l[1].length > 2) {
            text = i.toFixed(2);
          }
          dims = ctx.measureText(text);

          if (ruler.alignment == 'bottom' || ruler.alignment == 'top') {
            rulerctx.fillText(
              text,
              pos - x - dims.width / 2 + ruler.labels.position.x,
              ruler.labels.position.y
            );
          }
          else {
            rulerctx.fillText(
              text,
              Math.sign(ruler.labels.rotate) * pos - Math.sign(ruler.labels.rotate) * y - dims.width / 2 + ruler.labels.position.x,
              ruler.labels.position.y
            );
          }
        }
        rulerctx.restore();
      }

      ctx.save();
      ctx.drawImage(ruler._canvas, x, y, w, h);
      ctx.restore();

      if (isset(ruler.cursor, 'enabled')) {
        this._renderCursor(ctx, ruler);
      }
    },

    _renderRulers: function(ctx) {
      for (var ruler in this.rulers) {
        if (ruler == 'defaults' || !isset(this.rulers, ruler) || propExists(this.rulers[ruler], 'enabled') && !isset(this.rulers[ruler], 'enabled')) {
          continue;
        }
        this._renderRuler(ctx, this.rulers[ruler]);
      }
    },

    _renderUnitDisplay: function(ctx) {
      var x = this.units.display.position.x;
      var y = this.units.display.position.y;
      var w = this.units.display.width;
      var h = this.units.display.height;

      ctx.fillStyle = this.units.display.backgroundColor;
      ctx.fillRect(x, y, w, h);

      ctx.fillStyle = this.units.display.fontColor;
      ctx.font = this.units.display.font;
      var dims = ctx.measureText(this.units.type);
      ctx.fillText(
        this.units.type,
        w / 2 - dims.width / 2,
        h / 2 + (dims.actualBoundingBoxAscent + dims.actualBoundingBoxDescent) / 2
      );
    },

    _getAutoGridZoomIntervals: function() {
      var zoom = this.getZoom();
      // var spacing = Math.pow(10, Math.round(Math.log(zoom * 100 / 64) / Math.log(10)));

      var spacing = 0;
      var subdivisions = 5;

      if (zoom < .005) {
        spacing = 50000;
      }
      else if (zoom >= .005 && zoom < .01) {
        spacing = 10000;
      }
      else if (zoom >= .01 && zoom < .05) {
        spacing = 5000;
      }
      else if (zoom >= .05 && zoom < .1) {
        spacing = 1000;
      }
      else if (zoom >= .1  && zoom < .5) {
        spacing = 500;
      }
      else if (zoom >= .5 && zoom < 5) {
        spacing = 100;
      }
      else if (zoom >= 5 && zoom < 8) {
        spacing = 50;
      }
      else if (zoom >= 8 && zoom < 50) {
        spacing = 10;
        subdivisions = 10;
      }
      else {
        spacing = 1;
        subdivisions = 0;
      }

      return { 'spacing': spacing, 'subdivisions': subdivisions };
    },

    _renderGridSpacing: function(ctx, spacing, strokeStyle, lineWidth) {
      ctx.beginPath();
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;

      var i;
      var w = this.subcanvas.width;
      var h = this.subcanvas.height;
      var start = spacing;
      var end = this.subcanvas.width;
      var v = this.viewportTransform;

      var tl = fabric.util.transformPoint(this.subcanvas.aCoords.tl, v);
      var br = fabric.util.transformPoint(this.subcanvas.aCoords.br, v);

      if (tl.x < 0) {
        start = Math.round((-tl.x / v[0]) / spacing) * spacing;
      }
      if (br.x > this.width) {
        end = Math.floor((this.subcanvas.width - ((br.x - this.width) / v[0])) / spacing) * spacing;
      }

      for (i = start; i <= end; i += spacing) {
        ctx.moveTo(i * v[0], 0);
        ctx.lineTo(i * v[0], h * v[3]);
      }

      end = this.subcanvas.height - spacing;

      if (tl.y < 0) {
        start = Math.round((-tl.y / v[3]) / spacing) * spacing;
      }
      if (br.y > this.height) {
        end = Math.floor((this.subcanvas.height - ((br.y - this.height) / v[3])) / spacing) * spacing;
      }

      for (i = spacing; i <= h; i += spacing) {
        ctx.moveTo(0, i * v[3]);
        ctx.lineTo(w * v[0], i * v[3]);
      }
      ctx.stroke();
    },

    _renderGrid: function(ctx) {
      ctx.save();

      var v = this.viewportTransform;
      var zoom = this.getZoom();
      ctx.transform(1, v[1], v[2], 1, v[4], v[5]);

      var tx = this.subcanvas.width * v[0] / 2;
      var ty = this.subcanvas.height * v[3] / 2;
      ctx.translate(tx, ty);
      ctx.rotate(fabric.util.degreesToRadians(this.subcanvas.angle));
      ctx.translate(-tx, -ty);

      var spacing;
      var subdivisions;
      var intervals = this._getAutoGridZoomIntervals();
      if (this.grid.mode == 'automatic') {
        spacing = intervals.spacing;
        subdivisions = intervals.subdivisions;
      }
      else if (this.grid.mode == 'manual') {
        spacing = this.grid.spacing;
        subdivisions = this.grid.subdivisions;
      }
      min = intervals.subdivisions;

      this._renderGridSpacing(ctx, spacing, this.grid.lines.grid.strokeStyle, this.grid.lines.grid.size);
      spacing = Math.round(spacing / subdivisions);
      this._renderGridSpacing(ctx, spacing, this.grid.lines.subdivision.strokeStyle, this.grid.lines.subdivision.size);

      ctx.restore();
    },

    renderCanvas: function(ctx, objects) {
      var v = this.viewportTransform;
      if (this.isRendering) {
        fabric.util.cancelAnimFrame(this.isRendering);
        this.isRendering = 0;
      }
      this.calcViewportBoundaries();
      this.clearContext(ctx);
      this.fire('before:render');

      this.freeDrawingBrush.color = 'black';

      ctx.save();
      this._renderBackground(ctx, v);
      ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);

      if (this.clipTo) {
        this._beforeClip && this._beforeClip(ctx);
        fabric.util.clipContext(this, ctx);
        this._afterClip && this._afterClip(ctx);
      }

      this._renderObjects(ctx, objects);
      ctx.restore();

      if (this.clipTo) {
        ctx.restore();
      }

      if (isset(this.grid, 'mode')) {
        this._renderGrid(ctx);
      }

      ctx.restore();

      if (!this.controlsAboveOverlay && this.interactive) {
        this.drawControls(ctx);
      }
      this._renderOverlay(ctx);
      if (this.controlsAboveOverlay && this.interactive) {
        this.drawControls(ctx);
      }

      this._renderRulers(ctx);
      this._internal.rulersNeedRecalc = false;

      if (isset(this.units.display, 'enabled')) {
        this._renderUnitDisplay(ctx);
      }

      this.fire('after:render');
    }
  }
);
