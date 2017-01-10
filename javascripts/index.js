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
  var lastPoint;
  var marker = new PIXI.Graphics();
  stage.addChild(marker);
  var oldPoint, oldMidPoint;

  function onDragStart(event) {
    this.data = event.data;
    this.dragging = true;

      var point = new PIXI.Point(event.data.global.x, event.data.global.y);
      var x = event.data.global.x;
      var y = event.data.global.y;

      marker.clear().beginFill(0xffd900);
      marker.lineStyle(10, 0xffd900);
      marker.moveTo(point.x, point.y);
      marker.lineTo(point.x, point.y);
      marker.drawCircle(point.x, point.y, 0.4);
      oldPoint = oldMidPoint = point;
      renderer.render(stage);
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
      var midPoint = new PIXI.Point(oldPoint.x + point.x >> 1, oldPoint.y + point.y >> 1);
      marker.moveTo(midPoint.x, midPoint.y);
      marker.quadraticCurveTo(oldPoint.x, oldPoint.y, oldMidPoint.x, oldMidPoint.y);
      marker.drawCircle(midPoint.x, midPoint.y, 0.4);
      oldMidPoint = midPoint;
      oldPoint = point;
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
