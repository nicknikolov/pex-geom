// Generated by CoffeeScript 1.7.1
var EPSILON, Geometry, Loft, Mat4, PI, Path, Quat, Spline1D, Spline3D, Vec2, Vec3, acos, geom, merge, min,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

geom = require('pex-geom');

merge = require('merge');

Geometry = geom.Geometry;

Vec2 = geom.Vec2;

Vec3 = geom.Vec3;

Mat4 = geom.Mat4;

Quat = geom.Quat;

Spline3D = geom.Spline3D;

Path = require('./Path');

Spline1D = require('./Spline1D');

acos = Math.acos, PI = Math.PI, min = Math.min;

Spline3D.prototype.getTangentAt = function(t) {
  var np, p, v;
  p = this.getPointAt(t);
  np = this.getPointAt(t + 0.01);
  return v = Vec3.create().asSub(np, p).normalize();
};

EPSILON = 0.00001;

Loft = (function(_super) {
  __extends(Loft, _super);

  function Loft(path, options) {
    var defaults;
    Loft.__super__.constructor.call(this, {
      vertices: true,
      normals: true,
      texCoords: true,
      edges: true,
      faces: true
    });
    defaults = {
      numSteps: 200,
      numSegments: 8,
      r: 0.3,
      shapePath: null,
      closed: false,
      xShapeScale: 1,
      caps: false,
      initialNormal: null
    };
    path.samplesCount = 5000;
    this.options = options = merge(defaults, options);
    this.shapePath = options.path || this.makeShapePath(options.numSegments);
    this.rfunc = this.makeRadiusFunction(options.r);
    this.rufunc = options.ru ? this.makeRadiusFunction(options.ru) : this.rfunc;
    this.rvfunc = options.rv ? this.makeRadiusFunction(options.rv) : options.ru ? this.rufunc : this.rfunc;
    this.points = this.samplePoints(path, options.numSteps);
    this.tangents = this.sampleTangents(path, options.numSteps);
    this.frames = this.makeFrames(this.points, this.tangents, options.closed);
    this.buildGeometry(this.options.caps);
  }

  Loft.prototype.buildGeometry = function(caps) {
    var frame, i, index, j, numSegments, numSteps, p, _i, _j, _k, _l, _len, _m, _ref, _ref1;
    caps = typeof caps !== 'undefined' ? caps : false;
    if (this.options.loop) {
      caps = false;
    }
    index = 0;
    numSteps = this.options.numSteps;
    numSegments = this.options.numSegments;
    _ref = this.frames;
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      frame = _ref[i];
      for (j = _j = 0; 0 <= numSegments ? _j < numSegments : _j > numSegments; j = 0 <= numSegments ? ++_j : --_j) {
        p = this.shapePath.points[j % numSegments];
        p = p.dup();
        p.x *= this.rufunc(i, numSteps);
        p.y *= this.rvfunc(i, numSteps);
        p = p.transformMat4(frame.m).add(frame.position);
        this.vertices.push(p);
        this.texCoords.push(new Vec2(j / numSegments, i / numSteps));
        this.normals.push(p.dup().sub(frame.position).normalize());
      }
    }
    if (caps) {
      this.vertices.push(this.frames[0].position);
      this.texCoords.push(new Vec2(0, 0));
      this.normals.push(this.frames[0].tangent.dup().scale(-1));
      this.vertices.push(this.frames[this.frames.length - 1].position);
      this.texCoords.push(new Vec2(0, 0));
      this.normals.push(this.frames[this.frames.length - 1].tangent.dup().scale(-1));
    }
    index = 0;
    for (i = _k = 0, _ref1 = this.frames.length; 0 <= _ref1 ? _k < _ref1 : _k > _ref1; i = 0 <= _ref1 ? ++_k : --_k) {
      for (j = _l = 0; 0 <= numSegments ? _l < numSegments : _l > numSegments; j = 0 <= numSegments ? ++_l : --_l) {
        if (i < numSteps - 1) {
          this.faces.push([index + j, index + (j + 1) % numSegments, index + j + numSegments]);
          this.faces.push([index + j + numSegments, index + (j + 1) % numSegments, index + (j + 1) % numSegments + numSegments]);
          this.edges.push([index + j, index + (j + 1) % numSegments]);
          this.edges.push([index + (j + 1) % numSegments, index + j + numSegments]);
          this.edges.push([index + j, index + j + numSegments]);
        } else if (this.options.loop) {
          i;
        } else {
          this.edges.push([index + j, index + (j + 1) % numSegments]);
        }
      }
      index += numSegments;
    }
    if (caps) {
      for (j = _m = 0; 0 <= numSegments ? _m < numSegments : _m > numSegments; j = 0 <= numSegments ? ++_m : --_m) {
        this.faces.push([j, (j + 1) % numSegments, this.vertices.length - 2]);
        this.faces.push([index - numSegments + j, index - numSegments + (j + 1) % numSegments, this.vertices.length - 1]);
        this.edges.push([j, this.vertices.length - 2]);
        this.edges.push([index - numSegments + j, this.vertices.length - 1]);
      }
    }
  };

  Loft.prototype.makeShapePath = function(numSegments) {
    var a, i, p, shapePath, t, _i;
    shapePath = new Path();
    for (i = _i = 0; 0 <= numSegments ? _i < numSegments : _i > numSegments; i = 0 <= numSegments ? ++_i : --_i) {
      t = i / numSegments;
      a = t * 2 * Math.PI;
      p = new Vec3(Math.cos(a), Math.sin(a), 0);
      shapePath.addPoint(p);
    }
    shapePath.close();
    return shapePath;
  };

  Loft.prototype.makeFrames = function(points, tangents, closed, rot) {
    var atx, aty, atz, binormal, firstNormal, frame, frameIndex, frames, i, lastNormal, m, normal, position, prevBinormal, prevNormal, prevTangent, rotation, tangent, theta, v, _i, _j, _len, _ref;
    if (rot == null) {
      rot = 0;
    }
    tangent = tangents[0];
    atx = Math.abs(tangent.x);
    aty = Math.abs(tangent.y);
    atz = Math.abs(tangent.z);
    v = null;
    if (atz > atx && atz >= aty) {
      v = tangent.dup().cross(new Vec3(0, 1, 0));
    } else if (aty > atx && aty >= atz) {
      v = tangent.dup().cross(new Vec3(1, 0, 0));
    } else {
      v = tangent.dup().cross(new Vec3(0, 0, 1));
    }
    normal = this.options.initialNormal || Vec3.create().asCross(tangent, v).normalize();
    binormal = Vec3.create().asCross(tangent, normal).normalize();
    prevBinormal = null;
    prevNormal = null;
    frames = [];
    v = new Vec3();
    rotation = new Quat();
    for (i = _i = 0, _ref = points.length - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
      position = points[i];
      tangent = tangents[i];
      if (i > 0) {
        normal = normal.dup();
        binormal = binormal.dup();
        prevTangent = tangents[i - 1];
        v.asCross(prevTangent, tangent);
        if (v.length() > EPSILON) {
          v.normalize();
          theta = acos(prevTangent.dot(tangent));
          rotation.setAxisAngle(v, theta * 180 / PI);
          normal.transformQuat(rotation);
        }
        binormal.asCross(tangent, normal);
      }
      m = new Mat4().set4x4r(binormal.x, normal.x, tangent.x, 0, binormal.y, normal.y, tangent.y, 0, binormal.z, normal.z, tangent.z, 0, 0, 0, 0, 1);
      frames.push({
        tangent: tangent,
        normal: normal,
        binormal: binormal,
        position: position,
        m: m
      });
    }
    if (closed) {
      firstNormal = frames[0].normal;
      lastNormal = frames[frames.length - 1].normal;
      theta = firstNormal.dot(lastNormal);
      theta /= frames.length - 1;
      if (tangents[0].dot(v.asCross(firstNormal, lastNormal)) > 0) {
        theta = -theta;
      }
      for (frameIndex = _j = 0, _len = frames.length; _j < _len; frameIndex = ++_j) {
        frame = frames[frameIndex];
        rotation.setAxisAngle(frame.tangent, theta * frameIndex * 180 / PI);
        frame.normal.transformQuat(rotation);
        frame.binormal.asCross(frame.tangent, frame.normal);
        frame.m.set4x4r(frame.binormal.x, frame.normal.x, frame.tangent.x, 0, frame.binormal.y, frame.normal.y, frame.tangent.y, 0, frame.binormal.z, frame.normal.z, frame.tangent.z, 0, 0, 0, 0, 1);
      }
    }
    return frames;
  };

  Loft.prototype.samplePoints = function(path, numSteps) {
    var points, _i, _ref, _results;
    return points = (function() {
      _results = [];
      for (var _i = 0, _ref = numSteps - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; 0 <= _ref ? _i++ : _i--){ _results.push(_i); }
      return _results;
    }).apply(this).map(function(i) {
      return path.getPointAt(i / numSteps);
    });
  };

  Loft.prototype.sampleTangents = function(path, numSteps) {
    var tangents, _i, _ref, _results;
    return tangents = (function() {
      _results = [];
      for (var _i = 0, _ref = numSteps - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; 0 <= _ref ? _i++ : _i--){ _results.push(_i); }
      return _results;
    }).apply(this).map(function(i) {
      return path.getTangentAt(i / numSteps);
    });
  };

  Loft.prototype.makeRadiusFunction = function(r) {
    var rfunc;
    if (r instanceof Spline1D) {
      return rfunc = function(t, n) {
        return r.getPointAt(t / (n - 1));
      };
    } else {
      return rfunc = function(t) {
        return r;
      };
    }
  };


  /*
  toDebugLines: (lineLength=0.5) ->
    lineBuilder = new LineBuilder()
    for frame, frameIndex in @frames
      g = new Color(0, frameIndex/@frames.length, 0, 1)
      lineBuilder.addLine(frame.position, frame.position.dup().add(frame.tangent.dup().scale(lineLength)), Color.Red, Color.Red)
      lineBuilder.addLine(frame.position, frame.position.dup().add(frame.normal.dup().scale(lineLength)), g, g)
      lineBuilder.addLine(frame.position, frame.position.dup().add(frame.binormal.dup().scale(lineLength)), Color.Blue, Color.Blue)
    lineBuilder
  
  toDebugPoints: (lineLength=0.5) ->
    lineBuilder = new LineBuilder()
    for frame, frameIndex in @frames
      lineBuilder.addLine(frame.position, frame.position.dup().add(new Vec3(1,0,0).scale(lineLength/5)), Color.Red, Color.Red)
      lineBuilder.addLine(frame.position, frame.position.dup().add(new Vec3(0,1,0).scale(lineLength/5)), Color.Green, Color.Green)
      lineBuilder.addLine(frame.position, frame.position.dup().add(new Vec3(0,0,1).scale(lineLength/5)), Color.Blue, Color.Blue)
    lineBuilder
   */

  return Loft;

})(Geometry);

module.exports = Loft;