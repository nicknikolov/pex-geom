var geom = require('pex-geom');

var Vec3 = geom.Vec3;

//position is bottom left corner of the cell
function Octree(position, size, accuracy) {
  this.maxDistance = Math.max(size.x, Math.max(size.y, size.z));
  //this.accuracy = typeof accuracy !== 'undefined' ? accuracy : this.maxDistance / 100000;
  this.accuracy = 0;
  this.root = new Octree.Cell(this, position, size, 0);
}

Octree.fromBoundingBox = function (bbox) {
  return new Octree(bbox.min.clone(), bbox.getSize().clone());
};

Octree.MaxLevel = 8;

//p = {x, y, z}
Octree.prototype.add = function (p) {
  this.root.add(p);
};

//check if the point was already added to the octreee
Octree.prototype.has = function (p) {
  return this.root.has(p);
};

Octree.prototype.findNearestPoint = function (p, options) {
  options = options || { };
  options.count = 0;
  var b= this.root.findNearestPoint(p, Infinity, options);
  //console.log(options.count);
  return b;
};

Octree.prototype.getAllCellsAtLevel = function (cell, level, result) {
  if (typeof level == 'undefined') {
    level = cell;
    cell = this.root;
  }
  result = result || [];
  if (cell.level == level) {
    if (cell.points.length > 0) {
      result.push(cell);
    }
    return result;
  } else {
    cell.children.forEach(function (child) {
      this.getAllCellsAtLevel(child, level, result);
    }.bind(this));
    return result;
  }
};

Octree.Cell = function (tree, position, size, level) {
  this.tree = tree;
  this.position = position;
  this.size = size;
  this.level = level;
  this.points = [];
  this.temp = new Vec3(); //temp vector for distance calculation
  this.children = [];
};

Octree.Cell.prototype.has = function (p) {
  if (!this.contains(p))
    return null;
  if (this.children.length > 0) {
    for (var i = 0; i < this.children.length; i++) {
      var duplicate = this.children[i].has(p);
      if (duplicate) {
        return duplicate;
      }
    }
    return null;
  } else {
    var minDistSqrt = this.tree.accuracy * this.tree.accuracy;
    for (var i = 0; i < this.points.length; i++) {
      var o = this.points[i];
      var distSq = p.squareDistance(o);
      if (distSq <= minDistSqrt) {
        return o;
      }
    }
    return null;
  }
};

Octree.Cell.prototype.add = function (p) {
  this.points.push(p);
  if (this.children.length > 0) {
    this.addToChildren(p);
  } else {
    if (this.points.length > 1 && this.level < Octree.MaxLevel) {
      this.split();
    }
  }
};

Octree.Cell.prototype.addToChildren = function (p) {
  for (var i = 0; i < this.children.length; i++) {
    if (this.children[i].contains(p)) {
      this.children[i].add(p);
      break;
    }
  }
};

Octree.Cell.prototype.contains = function (p) {
  return p.x >= this.position.x - this.tree.accuracy
      && p.y >= this.position.y - this.tree.accuracy
      && p.z >= this.position.z - this.tree.accuracy
      && p.x < this.position.x + this.size.x + this.tree.accuracy
      && p.y < this.position.y + this.size.y + this.tree.accuracy
      && p.z < this.position.z + this.size.z + this.tree.accuracy;
};

// 1 2 3 4
// 5 6 7 8
Octree.Cell.prototype.split = function () {
  var x = this.position.x;
  var y = this.position.y;
  var z = this.position.z;
  var w2 = this.size.x / 2;
  var h2 = this.size.y / 2;
  var d2 = this.size.z / 2;
  this.children.push(new Octree.Cell(this.tree, Vec3.create(x, y, z), Vec3.create(w2, h2, d2), this.level + 1));
  this.children.push(new Octree.Cell(this.tree, Vec3.create(x + w2, y, z), Vec3.create(w2, h2, d2), this.level + 1));
  this.children.push(new Octree.Cell(this.tree, Vec3.create(x, y, z + d2), Vec3.create(w2, h2, d2), this.level + 1));
  this.children.push(new Octree.Cell(this.tree, Vec3.create(x + w2, y, z + d2), Vec3.create(w2, h2, d2), this.level + 1));
  this.children.push(new Octree.Cell(this.tree, Vec3.create(x, y + h2, z), Vec3.create(w2, h2, d2), this.level + 1));
  this.children.push(new Octree.Cell(this.tree, Vec3.create(x + w2, y + h2, z), Vec3.create(w2, h2, d2), this.level + 1));
  this.children.push(new Octree.Cell(this.tree, Vec3.create(x, y + h2, z + d2), Vec3.create(w2, h2, d2), this.level + 1));
  this.children.push(new Octree.Cell(this.tree, Vec3.create(x + w2, y + h2, z + d2), Vec3.create(w2, h2, d2), this.level + 1));
  for (var i = 0; i < this.points.length; i++) {
    this.addToChildren(this.points[i]);
  }
};

function pad(s, n) {
  for(var i=0; i<n; i++) {
    s = ' ' + s;
  }
  return s;
}

//Octree.Cell.prototype.manhattanDistance = function(p) {
//  return Math.min(
//    Math.abs(p.x - this.position.x),
//    Math.abs(p.x - this.position.x - this.size.x),
//    Math.abs(p.y - this.position.y),
//    Math.abs(p.y - this.position.y - this.size.y),
//    Math.abs(p.z - this.position.z),
//    Math.abs(p.z - this.position.z - this.size.z)
//  )
//}

Octree.Cell.prototype.squareDistanceToCenter = function(p) {
  var dx = p.x - (this.position.x + this.size.x / 2);
  var dy = p.y - (this.position.y + this.size.y / 2);
  var dz = p.z - (this.position.z + this.size.z / 2);
  return dx * dx + dy * dy + dz * dz;
}

Octree.Cell.prototype.findNearestPoint = function (p, bestDist, options) {
  var nearest = null;
  options.count++;
  if (this.points.length > 0 && this.children.length == 0) {
    for (var i = 0; i < this.points.length; i++) {
      var distSq = this.points[i].distance(p);
      if (distSq <= bestDist) {
        if (distSq == 0 && options.notSelf)
          continue;
        bestDist = distSq;
        nearest = this.points[i];
      }
    }
  }

  var children = this.children;

  //traverse children in order from closes to furthest
  var children = this.children
    .map(function(child) { return { child: child, dist: child.squareDistanceToCenter(p) } })
    .sort(function(a, b) { return a.dist - b.dist; })
    .map(function(c) { return c.child; });

  if (children.length > 0) {
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.points.length > 0) {
        //console.log(child.manhattanDistance(p))
        //if (child.manhattanDistance(p) > bestDist) continue;
        if (p.x < child.position.x - bestDist || p.x > child.position.x + child.size.x + bestDist ||
            p.y < child.position.y - bestDist || p.y > child.position.y + child.size.y + bestDist ||
            p.z < child.position.z - bestDist || p.z > child.position.z + child.size.z + bestDist
          ) {
          continue;
        }
        var childNearest = child.findNearestPoint(p, bestDist, options, i);
        if (!childNearest) {
          continue;
        }
        var childNearestDist = childNearest.distance(p);
        if (childNearestDist < bestDist) {
          nearest = childNearest;
          bestDist = childNearestDist;
        }
      }
    }
  }
  return nearest;
};

module.exports = Octree;