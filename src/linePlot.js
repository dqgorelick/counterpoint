var PIXI = require('pixi.js');

// drawing
var SHIFT = false;
var MARKER = true;
var ARCS = false;
var CENTERLINE = false;

var renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight, {
  antialias: true,
  transparent: true,
  resolution: 1
});

document.getElementById('drawing').appendChild(renderer.view);

var stage = new PIXI.Container();
stage.hitArea = new PIXI.Rectangle(0, 0, window.innerWidth, window.innerHeight);
stage.interactive = true;
stage.buttonMode = true;
stage
  .on('mousedown', onDragStart)
  .on('touchstart', onDragStart)
  .on('mouseup', onDragEnd)
  .on('mouseupoutside', onDragEnd)
  .on('touchend', onDragEnd)
  .on('touchendoutside', onDragEnd)
  .on('mousemove', onDragMove)
  .on('touchmove', onDragMove);

createCenterLine();
function createCenterLine() {
  var graphics = new PIXI.Graphics();
  if (CENTERLINE) {
    graphics.beginFill(0xFFFFFF, 1);
    graphics.drawRect(0, window.innerHeight / 2 + 20, window.innerWidth, 3);
    graphics.endFill();
  }
  stage.addChild(graphics);
}

requestAnimationFrame(animate);
function animate() {
  requestAnimationFrame(animate);
  renderer.render(stage);
}


var line = [];
var marker = new PIXI.Graphics();
var shiftMarker = new PIXI.Graphics();

var arcs = new PIXI.Graphics();
var nodes = [];

stage.addChild(marker);
stage.addChild(shiftMarker);
stage.addChild(arcs);

var lastPoint;
var lastMidPoint;

function addNode(node) {
  nodes.push(node);
  console.log('nodes.length',nodes.length);
  if(nodes.length > 1) {
    if (ARCS) {
      drawArc();
    }
  }
  marker.beginFill(0xffd900, 1);
  marker.drawCircle(node.x, node.y, 10);
  marker.endFill();

}

function drawArc() {
  var curNode = nodes[nodes.length-1];
  var lastNode = nodes[nodes.length-2];
  console.log('curNode.dir',curNode.dir);
  var left = curNode.x;
  var radius = (curNode.x - lastNode.x) >> 1;
  console.log('radius',radius);
  arcs.clear().lineStyle().lineStyle(2, 0x00FFF2);
  var flipped = (curNode.dir === 'up' && radius < 0 || curNode.dir === 'down' && radius > 0);
  console.log('flipped',flipped);
  arcs.arc(left - radius, curNode.y, (flipped ? -radius : radius), 0, Math.PI);

  renderer.render(stage);
}

function checkLine(touch, lastTouch) {
  var lineCenter = window.innerHeight/2 + 20;
  if ((touch.y >= lineCenter && lastTouch.y < lineCenter) | (touch.y <= lineCenter && lastTouch.y > lineCenter)) {
    var m = (lastTouch.y - touch.y) / (lastTouch.x - touch.x);
    var dy =  lastTouch.y - lineCenter;
    var x_tar = (m*lastTouch.x - dy) / m;
    var direction = touch.y > lastTouch.y ? 'down' : 'up';
    if (!!x_tar) {
      addNode({x: x_tar, y:lineCenter, dir: direction});
    } else {
      addNode({x: lastTouch.x, y:lineCenter, dir: direction});
    }
  }
}

function drawLine() {
  shiftMarker.clear();
  shiftMarker.lineStyle(4, 0x00FFF2);
  line.forEach(function(pt, it) {
    if (it === 0) {
      shiftMarker.moveTo(pt.point.x, pt.point.y);
      shiftMarker.lineTo(pt.point.x, pt.point.y);
    } else {
      shiftMarker.moveTo(pt.midPoint.x, pt.midPoint.y);
      shiftMarker.quadraticCurveTo(line[it-1].point.x, line[it-1].point.y, line[it-1].midPoint.x, line[it-1].midPoint.y);
    }
  })
  renderer.render(stage);
}

function onDragStart(event) {
  this.data = event.data;
  this.dragging = true;
  var point = new PIXI.Point(event.data.global.x, event.data.global.y);
  line = [];
  nodes = [];
  if (MARKER) {
    marker.clear();
    marker.lineStyle(4, 0xffd900);
    marker.moveTo(point.x, point.y);
    marker.lineTo(point.x, point.y);
    renderer.render(stage);
  }
  lastPoint = lastMidPoint = point;
  drawLine();
  line.push({point: {x: point.x, y: point.y}, midPoint: lastMidPoint});
}

function onDragEnd(event) {
  this.dragging = false;
  this.data = null;
  marker.endFill();
  drawLine();
  renderer.render(stage);
}

var totalDistance = 0;
function getDistance(point, lastPoint) {
  totalDistance += Math.sqrt((point.x-lastPoint.x)*(point.x-lastPoint.x) + (point.y-lastPoint.y)*(point.y-lastPoint.y));
}

var count = 0;
function onDragMove(event) {
    count++;
    if(this.dragging && count%2 === 0) {
      var point = new PIXI.Point(event.data.global.x, event.data.global.y);
      var midPoint = new PIXI.Point(lastPoint.x + point.x >> 1, lastPoint.y + point.y >> 1);
      if (lastPoint) {
        getDistance(point, lastPoint);
        checkLine(point, lastPoint);
      }
      if (MARKER) {
        marker.moveTo(midPoint.x, midPoint.y);
        marker.quadraticCurveTo(lastPoint.x, lastPoint.y, lastMidPoint.x, lastMidPoint.y);
        renderer.render(stage);
      }
      lastMidPoint = midPoint;
      lastPoint = point;
      if (SHIFT) {
        console.log('totalDistance',totalDistance);
        if(totalDistance > 10) {
          totalDistance = 0;
          line.push({point: {x: point.x, y: point.y}, midPoint: midPoint});
        }
        if (line.length > 20) {
          line.shift();
        }
        if(count%2 === 0) {
          drawLine();
        }
      }
    }
}

window.onresize = function(event) {
  var w = window.innerWidth;
  var h = window.innerHeight;
  renderer.view.style.width = w + "px";
  renderer.view.style.height = h + "px";
  renderer.resize(w, h);
};
