(function() {
  fabric.util.object.extend(fabric.Object.prototype, /** @lends fabric.Object.prototype */ {
    /**
    * @private
    */
    getNonZeroSegments: function(pathToSegment, breakPoint) {
      var segment1 = MakerJs.cloneObject(pathToSegment);
      if (!segment1)
      return null;
      var segment2 = MakerJs.path.breakAtPoint(segment1, breakPoint);
      if (segment2) {
        var segments = [segment1, segment2];
        for (var i = 2; i--;) {
          if (MakerJs.round(MakerJs.measure.pathLength(segments[i]), .0001) == 0) {
            return null;
          }
        }
        return segments;
      }
      else if (pathToSegment.type == MakerJs.pathType.Circle) {
        return [segment1];
      }
      return null;
    },

    /**
    * @private
    */
    breakAlongForeignPath: function(crossedPath, overlappedSegments, foreignWalkedPath) {
      var foreignPath = foreignWalkedPath.pathContext;
      var segments = crossedPath.segments;
      if (MakerJs.measure.isPathEqual(segments[0].path, foreignPath, .0001, crossedPath.offset, foreignWalkedPath.offset)) {
        segments[0].overlapped = true;
        segments[0].duplicate = true;
        overlappedSegments.push(segments[0]);
        return;
      }
      var foreignPathEndPoints;
      for (var i = 0; i < segments.length; i++) {
        var pointsToCheck;
        var options = { path1Offset: crossedPath.offset, path2Offset: foreignWalkedPath.offset };
        var foreignIntersection = MakerJs.path.intersection(segments[i].path, foreignPath, options);
        if (foreignIntersection) {
          pointsToCheck = foreignIntersection.intersectionPoints;
        }
        else if (options.out_AreOverlapped) {
          segments[i].overlapped = true;
          overlappedSegments.push(segments[i]);
          if (!foreignPathEndPoints) {
            //make sure endpoints are in absolute coords
            foreignPathEndPoints = MakerJs.point.fromPathEnds(foreignPath, foreignWalkedPath.offset);
          }
          pointsToCheck = foreignPathEndPoints;
        }
        if (pointsToCheck) {
          //break the path which intersected, and add the shard to the end of the array so it can also be checked in this loop for further sharding.
          var subSegments = null;
          var p = 0;
          while (!subSegments && p < pointsToCheck.length) {
            //cast absolute points to path relative space
            subSegments = getNonZeroSegments(segments[i].path, MakerJs.point.subtract(pointsToCheck[p], crossedPath.offset));
            p++;
          }
          if (subSegments) {
            crossedPath.broken = true;
            segments[i].path = subSegments[0];
            if (subSegments[1]) {
              var newSegment = {
                path: subSegments[1],
                pathId: segments[0].pathId,
                overlapped: segments[i].overlapped,
                uniqueForeignIntersectionPoints: [],
                offset: crossedPath.offset
              };
              if (segments[i].overlapped) {
                overlappedSegments.push(newSegment);
              }
              segments.push(newSegment);
            }
            //re-check this segment for another deep intersection
            i--;
          }
        }
      }
    },

    /**
    * @private
    */
    breakAllPathsAtIntersections: function(modelToBreak, modelToIntersect, checkIsInside, modelToBreakAtlas, modelToIntersectAtlas, farPoint) {
      var crossedPaths = [];
      var overlappedSegments = [];
      var walkModelToBreakOptions = {
        onPath: function (outerWalkedPath) {
          //clone this path and make it the first segment
          var segment = {
            path: MakerJs.cloneObject(outerWalkedPath.pathContext),
            pathId: outerWalkedPath.pathId,
            overlapped: false,
            uniqueForeignIntersectionPoints: [],
            offset: outerWalkedPath.offset
          };
          var thisPath = outerWalkedPath;
          thisPath.broken = false;
          thisPath.segments = [segment];
          var walkModelToIntersectOptions = {
            onPath: function (innerWalkedPath) {
              if (outerWalkedPath.pathContext !== innerWalkedPath.pathContext && MakerJs.measure.isMeasurementOverlapping(modelToBreakAtlas.pathMap[outerWalkedPath.routeKey], modelToIntersectAtlas.pathMap[innerWalkedPath.routeKey])) {
                breakAlongForeignPath(thisPath, overlappedSegments, innerWalkedPath);
              }
            },
            beforeChildWalk: function (innerWalkedModel) {
              //see if there is a model measurement. if not, it is because the model does not contain paths.
              var innerModelMeasurement = modelToIntersectAtlas.modelMap[innerWalkedModel.routeKey];
              return innerModelMeasurement && MakerJs.measure.isMeasurementOverlapping(modelToBreakAtlas.pathMap[outerWalkedPath.routeKey], innerModelMeasurement);
            }
          };
          //keep breaking the segments anywhere they intersect with paths of the other model
          model.walk(modelToIntersect, walkModelToIntersectOptions);
          if (checkIsInside) {
            //check each segment whether it is inside or outside
            for (var i = 0; i < thisPath.segments.length; i++) {
              var p = MakerJs.point.add(MakerJs.point.middle(thisPath.segments[i].path), thisPath.offset);
              var pointInsideOptions = { measureAtlas: modelToIntersectAtlas, farPoint: farPoint };
              thisPath.segments[i].isInside = MakerJs.measure.isPointInsideModel(p, modelToIntersect, pointInsideOptions);
              thisPath.segments[i].uniqueForeignIntersectionPoints = pointInsideOptions.out_intersectionPoints;
            }
          }
          crossedPaths.push(thisPath);
        }
      };
      model.walk(modelToBreak, walkModelToBreakOptions);
      return { crossedPaths: crossedPaths, overlappedSegments: overlappedSegments };
    },

    /**
    * @private
    */
    checkForEqualOverlaps: function(crossedPathsA, crossedPathsB, pointMatchingDistance) {
      function compareSegments(segment1, segment2) {
        if (MakerJs.measure.isPathEqual(segment1.path, segment2.path, pointMatchingDistance, segment1.offset, segment2.offset)) {
          segment1.duplicate = segment2.duplicate = true;
        }
      }
      function compareAll(segment) {
        for (var i = 0; i < crossedPathsB.length; i++) {
          compareSegments(crossedPathsB[i], segment);
        }
      }
      for (var i = 0; i < crossedPathsA.length; i++) {
        compareAll(crossedPathsA[i]);
      }
    },

    /**
    * @private
    */
    addOrDeleteSegments: function(crossedPath, includeInside, includeOutside, keepDuplicates, atlas, trackDeleted) {
      function addSegment(modelContext, pathIdBase, segment) {
        var id = model.getSimilarPathId(modelContext, pathIdBase);
        var newRouteKey = (id == pathIdBase) ? crossedPath.routeKey : MakerJs.createRouteKey(crossedPath.route.slice(0, -1).concat([id]));
        modelContext.paths[id] = segment.path;
        if (crossedPath.broken) {
          //save the new segment's measurement
          var measurement = MakerJs.measure.pathExtents(segment.path, crossedPath.offset);
          atlas.pathMap[newRouteKey] = measurement;
          atlas.modelsMeasured = false;
        }
        else {
          //keep the original measurement
          atlas.pathMap[newRouteKey] = savedMeasurement;
        }
      }
      function checkAddSegment(modelContext, pathIdBase, segment) {
        if (segment.isInside && includeInside || !segment.isInside && includeOutside) {
          addSegment(modelContext, pathIdBase, segment);
        }
        else {
          atlas.modelsMeasured = false;
          trackDeleted(segment.path, crossedPath.routeKey, segment.offset, 'segment is ' + (segment.isInside ? 'inside' : 'outside') + ' intersectionPoints=' + JSON.stringify(segment.uniqueForeignIntersectionPoints));
        }
      }
      //save the original measurement
      var savedMeasurement = atlas.pathMap[crossedPath.routeKey];
      //delete the original, its segments will be added
      delete crossedPath.modelContext.paths[crossedPath.pathId];
      delete atlas.pathMap[crossedPath.routeKey];
      for (var i = 0; i < crossedPath.segments.length; i++) {
        if (crossedPath.segments[i].duplicate) {
          if (keepDuplicates) {
            addSegment(crossedPath.modelContext, crossedPath.pathId, crossedPath.segments[i]);
          }
          else {
            trackDeleted(crossedPath.segments[i].path, crossedPath.routeKey, crossedPath.offset, 'segment is duplicate');
          }
        }
        else {
          checkAddSegment(crossedPath.modelContext, crossedPath.pathId, crossedPath.segments[i]);
        }
      }
    },

    /**
    * Combine 2 models. Each model will be modified accordingly.
    *
    * @param modelA First model to combine.
    * @param modelB Second model to combine.
    * @param includeAInsideB Flag to include paths from modelA which are inside of modelB.
    * @param includeAOutsideB Flag to include paths from modelA which are outside of modelB.
    * @param includeBInsideA Flag to include paths from modelB which are inside of modelA.
    * @param includeBOutsideA Flag to include paths from modelB which are outside of modelA.
    * @param options Optional ICombineOptions object.
    * @returns A new model containing both of the input models as "a" and "b".
    */
    combine: function(modelA, modelB, includeAInsideB, includeAOutsideB, includeBInsideA, includeBOutsideA, options) {
      if (includeAInsideB === void 0) { includeAInsideB = false; }
      if (includeAOutsideB === void 0) { includeAOutsideB = true; }
      if (includeBInsideA === void 0) { includeBInsideA = false; }
      if (includeBOutsideA === void 0) { includeBOutsideA = true; }
      var opts = {
        trimDeadEnds: true,
        pointMatchingDistance: .005,
        out_deleted: [{ paths: {} }, { paths: {} }]
      };
      MakerJs.extendObject(opts, options);
      opts.measureA = opts.measureA || new MakerJs.measure.Atlas(modelA);
      opts.measureB = opts.measureB || new MakerJs.measure.Atlas(modelB);
      //make sure model measurements capture all paths
      opts.measureA.measureModels();
      opts.measureB.measureModels();
      if (!opts.farPoint) {
        var measureBoth = MakerJs.measure.increase(MakerJs.measure.increase({ high: [null, null], low: [null, null] }, opts.measureA.modelMap['']), opts.measureB.modelMap['']);
        opts.farPoint = MakerJs.point.add(measureBoth.high, [1, 1]);
      }
      var pathsA = this.breakAllPathsAtIntersections(modelA, modelB, true, opts.measureA, opts.measureB, opts.farPoint);
      var pathsB = this.breakAllPathsAtIntersections(modelB, modelA, true, opts.measureB, opts.measureA, opts.farPoint);
      checkForEqualOverlaps(pathsA.overlappedSegments, pathsB.overlappedSegments, opts.pointMatchingDistance);
      function trackDeleted(which, deletedPath, routeKey, offset, reason) {
        model.addPath(opts.out_deleted[which], deletedPath, 'deleted');
        MakerJs.path.moveRelative(deletedPath, offset);
        var p = deletedPath;
        p.reason = reason;
        p.routeKey = routeKey;
      }
      for (var i = 0; i < pathsA.crossedPaths.length; i++) {
        this.addOrDeleteSegments(pathsA.crossedPaths[i], includeAInsideB, includeAOutsideB, true, opts.measureA, function (p, id, o, reason) { return trackDeleted(0, p, id, o, reason); });
      }
      for (var i = 0; i < pathsB.crossedPaths.length; i++) {
        this.addOrDeleteSegments(pathsB.crossedPaths[i], includeBInsideA, includeBOutsideA, false, opts.measureB, function (p, id, o, reason) { return trackDeleted(1, p, id, o, reason); });
      }
      var result = { models: { a: modelA, b: modelB } };
      if (opts.trimDeadEnds) {
        var shouldKeep;
        //union
        if (!includeAInsideB && !includeBInsideA) {
          shouldKeep = function (walkedPath) {
            //When A and B share an outer contour, the segments marked as duplicate will not pass the "inside" test on either A or B.
            //Duplicates were discarded from B but kept in A
            for (var i = 0; i < pathsA.overlappedSegments.length; i++) {
              if (pathsA.overlappedSegments[i].duplicate && walkedPath.pathContext === pathsA.overlappedSegments[i].path) {
                return false;
              }
            }
            //default - keep the path
            return true;
          };
        }
        model.removeDeadEnds(result, null, shouldKeep, function (wp, reason) {
          var which = wp.route[1] === 'a' ? 0 : 1;
          trackDeleted(which, wp.pathContext, wp.routeKey, wp.offset, reason);
        });
      }
      //pass options back to caller
      MakerJs.extendObject(options, opts);
      return result;
    },

    /**
    * Combine 2 models, resulting in a intersection. Each model will be modified accordingly.
    *
    * @param modelA First model to combine.
    * @param modelB Second model to combine.
    * @returns A new model containing both of the input models as "a" and "b".
    */
    combineIntersection: function(modelA, modelB) {
      return this.combine(modelA, modelB, true, false, true, false);
    },

    /**
    * Combine 2 models, resulting in a subtraction of B from A. Each model will be modified accordingly.
    *
    * @param modelA First model to combine.
    * @param modelB Second model to combine.
    * @returns A new model containing both of the input models as "a" and "b".
    */
    combineSubtraction: function(modelA, modelB) {
      return this.combine(modelA, modelB, false, true, true, false);
    },

    /**
    * Combine 2 models, resulting in a union. Each model will be modified accordingly.
    *
    * @param modelA First model to combine.
    * @param modelB Second model to combine.
    * @returns A new model containing both of the input models as "a" and "b".
    */
    combineUnion: function(modelA, modelB) {
      return this.combine(modelA, modelB, false, true, false, true);
    }
  });
})();
