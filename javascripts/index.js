(function() {
  var renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight, {
    antialias: true,
    backgroundColor: 0x000000
  });
  document.body.appendChild(renderer.view);

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
    graphics.beginFill(0xFFFFFF, 1);
    graphics.drawRect(0, window.innerHeight / 2, window.innerWidth, 3);
    graphics.endFill();
    stage.addChild(graphics);
  }

  requestAnimationFrame(animate);
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(stage);
  }

  var line = [];
  var marker = new PIXI.Graphics();
  stage.addChild(marker);
  var lastPoint;
  var lastMidPoint;

  function addNode(point) {
    marker.drawCircle(point.x, point.y, 10);
  }

  function checkLine(touch, lastTouch) {
    var lineCenter = window.innerHeight/2;
    if ((touch.y >= lineCenter && lastTouch.y < lineCenter) | (touch.y <= lineCenter && lastTouch.y > lineCenter)) {
      var m = (lastTouch.y - touch.y) / (lastTouch.x - touch.x);
      var dy =  lastTouch.y - lineCenter;
      var x_tar = (m*lastTouch.x - dy) / m;

      var direction = touch.y > lastTouch.y ? 'down' : 'up';
      console.log(direction);
      if (!!x_tar) {
        addNode({x: x_tar, y:lineCenter});
      } else {
        addNode({x: lastTouch.x, y:lineCenter});
      }
    }
  }

  function onDragStart(event) {
    this.data = event.data;
    this.dragging = true;
    var point = new PIXI.Point(event.data.global.x, event.data.global.y);
    line = [];
    marker.clear().beginFill(0xffd900);
    marker.lineStyle(10, 0xffd900);
    marker.moveTo(point.x, point.y);
    marker.lineTo(point.x, point.y);
    marker.drawCircle(point.x, point.y, 0.4);
    lastPoint = lastMidPoint = point;
    renderer.render(stage);
    line.push({x: point.x, y: point.y});
  }

  function onDragEnd(event) {
    this.dragging = false;
    this.data = null;
    marker.endFill();
    renderer.render(stage);
  }

  function onDragMove(event) {
    if(this.dragging) {
      var point = new PIXI.Point(event.data.global.x, event.data.global.y);
      var midPoint = new PIXI.Point(lastPoint.x + point.x >> 1, lastPoint.y + point.y >> 1);
      if (lastPoint) {
        checkLine(point, lastPoint);
      }
      marker.moveTo(midPoint.x, midPoint.y);
      marker.quadraticCurveTo(lastPoint.x, lastPoint.y, lastMidPoint.x, lastMidPoint.y);
      marker.drawCircle(midPoint.x, midPoint.y, 0.4);
      lastMidPoint = midPoint;
      lastPoint = point;
      line.push({x: point.x, y: point.y});
      renderer.render(stage);
    }
  }

  window.onresize = function(event) {
    var w = window.innerWidth;
    var h = window.innerHeight;
    renderer.view.style.width = w + "px";
    renderer.view.style.height = h + "px";
    renderer.resize(w, h);
  };
})();
