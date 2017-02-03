import '../assets/styles.scss';
import $ from 'jquery';
var PIXI = require('pixi.js');

/*
  feature flags
 */

// drawing
var SHIFT = false;
var MARKER = true;
var ARCS = false;
var CENTERLINE = false;

// counterpoint
var QUANTIZE = true;
var PORT_PLAYER = 8888;

var DEFAULT_BASE_NOTE = 48;
var DEFAULT_SONG_RATE = 450;

var MODES = { player: 1, song: 2 };
// var TEST_SONG = [7,11,9,11,7,11,9,11,7,12,10,12,7,12,10,12];
var TEST_SONG = [7, 11, 9, 11, 7, 12, 10, 12];
// var TEST_SONG_HARMONY = [0, 2, 4, 2, 0, 2, 4, 2, 0, 3, 5, 3, 0, 3, 5, 3];
var TEST_SONG_HARMONY = [4, 0, 2, 0, 4, 0, 2, 0, 5, 3, 4, 3, 5, 3, 4, 3];
var CLIMBING_SONG_1 = [0, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 8, 7, 9, 8, 10, 9, 11, 10, 12, 11, 13, 12, 14];
// var CLIMBING_SONG_2 = [1,3,2,4,3,5,4,6,5,7,6,8,7,9,8,10,9,11,10,12,11,13,12,14,13,15];
var CLIMBING_SONG_2 = [0, 2, 4, 6, 7, 9, 11, 13, 14];

var MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
var MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

var TEMPOS = {
  0: 200,
  1: 400,
  2: 800
}

var CANVAS_TOP = null; // get this from the css file from .note
var CURSOR_WIDTH = 26;
var CW = 1;
var CCW = -1;
var CURSOR_LEFT = 0;
var CURSOR_RIGHT = 1;
var STEPS = 16;
var NOTE_DURATION = 200; // 0.2 second delay set in SuperCollider

var notes = [];

var Player = function(id, options, sendNote) {
  // parameters
  this.id = id;
  this.baseNote = options.baseNote || DEFAULT_BASE_NOTE;
  this.songRate = options.songRate || DEFAULT_SONG_RATE;
  this.songTempo = options.songTempo || 1;
  this.mode = options.mode || MODES.song;
  this.timeout = 0;
  // socket callback
  this.sendNote = sendNote;
  // song mode
  this.song = options.song || TEST_SONG;
  this.songIndex = 0;
  this.dir = options.dir || CW;
  // movement logic
  this.playing = false;
  this.meter = null;
  this.rotationCount = 0;
  this.toFlip = false;
  this.leftHand = null;
  this.rightHand = null;
  this.color = '#57AA83' || options.color;
  this.states = {
    1: {
      rotation: CW,
      orientation: CURSOR_RIGHT
    },
    2: {
      rotation: CCW,
      orientation: CURSOR_LEFT
    },
    3: {
      rotation: CW,
      orientation: CURSOR_RIGHT
    },
    4: {
      rotation: CCW,
      orientation: CURSOR_LEFT
    }
  }

  // create player span
  $('.players').append(
    '<div class="player" id="' + this.id + '"><span><div class="cursor-wrapper"><div class="cursor"></div><div class="cursor-right"></div></div></span></div>'
  );
  this.jQuery = $('#' + this.id + ' span');
  this.cursorRight = this.jQuery.find('.cursor-right');
  this.cursorLeft = this.jQuery.find('.cursor');

  this.jQuery.css('-webkit-transition', '-webkit-transform ' + this.songRate + 'ms linear');
  this.jQuery.css('transition', 'transform ' + this.songRate + 'ms linear');
  this.cursorRight.css('background-color', options.color.hex);
  this.cursorLeft.css('background-color', options.color.hex);
}
Player.prototype.tempo = function(tempo) {
  this.songTempo = tempo;
  this.songRate = TEMPOS[tempo];
  this.jQuery.css('-webkit-transition', '-webkit-transform ' + this.songRate + 'ms linear');
  this.jQuery.css('transition', 'transform ' + this.songRate + 'ms linear');
}
Player.prototype.start = function() {
  var self = this;

  function nextNote() {
    var current, next, next_2;
    current = self.song[self.songIndex];
    next = self.song[(self.songIndex + 1) % self.song.length];
    next_2 = self.song[(self.songIndex + 2) % self.song.length];

    // sets last note for reference if there is a string of the same notes
    if (current !== next && next === next_2) {
      self.lastNote = current;
    }
    // get actual note mappings
    var midiNote = (current < 7 ? 0 : (current > 13 ? 24 : 12)) + self.baseNote + MINOR_SCALE[(current) % 7];

    // initial setup
    if (!self.leftHand && !self.rightHand) {
      if (current <= next) {
        self.state = 1;
      } else if (current > next) {
        self.state = 2;
      }
    } else {
      switch (self.state) {
        case 1:
          self.state = (self.toFlip ? 2 : 1);
          break;
        case 2:
          self.state = (self.toFlip ? 1 : 2);
          break;
        case 3:
          self.state = (self.toFlip ? 4 : 3);
          break;
        case 4:
          self.state = (self.toFlip ? 3 : 4);
          break;
        default:
          console.error('invalid state reached');
          break;
      }
      self.toFlip = false;
    }

    if (current < next && next < next_2) {
      self.toFlip = true;
    } else if (current > next && next > next_2) {
      self.toFlip = true;
    } else if (current === next && next !== next_2) {
      if (self.lastNote) {
        if (self.lastNote < next && next < next_2) {
          self.toFlip = true;
        } else if (self.lastNote > next && next > next_2) {
          self.toFlip = true;
        }
      } else {
        // by default we only start CW
        if (next > next_2) {
          self.toFlip = true;
        }
      }
    }

    if (current < next) {
      self.leftHand = notes[current];
      self.rightHand = notes[next];
    } else if (current > next) {
      self.leftHand = notes[next];
      self.rightHand = notes[current];
    } else if (current === next) {
      self.rightHand = notes[current];
      self.leftHand = notes[current];
    }

    if (self.song.length > 0) {
      // play and animate note
      self.sendNote(midiNote, self.songTempo);
      animateNote(current, 150);
    }

    // render cursor
    self.render();

    // recursive call at SONG_RATE
    self.meter = setTimeout(nextNote, self.songRate);
    self.songIndex++;
    if (self.songIndex === self.song.length) self.songIndex = 0;
  }

  if (!this.playing) {
    nextNote();
    this.playing = true;
  }
}
Player.prototype.render = function() {
  if (this.song.length === 0) {
    // no notes played
    this.cursorRight.css('display', 'none');
    this.cursorLeft.css('display', 'none');
    return;
  }
  if (!this.rightHand && !this.leftHand) {
    // first pass through
    return;
  }
  var params = this.states[this.state];
  if (this.rightHand !== this.leftHand) {
    this.rotationCount += params.rotation;
    this.jQuery.css('-webkit-transform', 'rotate(' + (this.rotationCount) * 180 + 'deg)');
    this.jQuery.css('transform:', 'rotate(' + (this.rotationCount) * 180 + 'deg)');
  }

  if (params.orientation === CURSOR_LEFT) {
    this.cursorRight.css('display', 'initial')
    this.cursorLeft.css('display', 'none')
  } else {
    this.cursorRight.css('display', 'none')
    this.cursorLeft.css('display', 'initial')
  }
  var diameter = this.rightHand.center - this.leftHand.center;
  var top = CANVAS_TOP + this.leftHand.width / 4 - diameter / 2;
  var left = this.leftHand.center;
  this.jQuery.css('top', top);
  this.jQuery.css('left', left);
  this.jQuery.css('height', diameter);
  this.jQuery.css('width', diameter);
}
Player.prototype.stop = function() {
  clearTimeout(this.meter);
  this.playing = false;
}
Player.prototype.remove = function() {
  $('#' + this.id).remove();
}
Player.prototype.reset = function() {
  this.lastNote = null;
  this.leftHand = null;
  this.rightHand = null;
  this.songIndex = 0;
  this.meter = null;
  this.toFlip = false;
  this.rotationCount = this.rotationCount + (this.rotationCount % 2 ? 1 : 0);
}

// create the note objects
function createNotes(baseNote, cb) {
  var maxWidth = window.innerWidth;
  for (var i = 0; i < STEPS; i++) {
    var noteWidth = maxWidth / STEPS;
    notes[i] = {
      id: i,
      midi: DEFAULT_BASE_NOTE + (i < 7 ? 0 : (i > 13 ? 24 : 12)) + MINOR_SCALE[(i % MINOR_SCALE.length)],
      left: noteWidth * i,
      width: noteWidth,
      height: noteWidth / 2,
      top: noteWidth / 4,
      center: noteWidth * i + noteWidth / 2
    }
  }
  cb();
}

function renderNotes() {
  var noteHeight;
  $('#canvas').html(
    (function() {
      var notesHTML = '';
      notes.forEach(function(note, iter) {
        var color = parseInt((180 * (iter / STEPS) + 60)).toString(16);
        noteHeight = note.height;
        notesHTML += (
          '<div ' +
          'class="note" ' +
          'id="' + iter + '" ' +
          'style="' +
          'left:' + note.left + 'px;' +
          'top:' + note.top + 'px;' +
          'width:' + note.width + 'px;' +
          'height:' + note.height + 'px;' +
          '" ' +
          '></div>'
        );
      });
      return notesHTML;
    })()
  );
  $('.scale').html(
    (function() {
      return (
        '<div class="scale-background"' +
        'style="' +
        'top:' + CANVAS_TOP + 'px;' +
        'height:' + noteHeight + 'px;' +
        '" ' +
        '></div>'
      )
    })()
  )
}

function initializeSettings() {
  $('.note').css('top', CANVAS_TOP);
}

function animateNote(note, duration) {
  // note transition
  var activeNote = $('#' + note);
  activeNote.addClass('active');
  setTimeout(function() {
    activeNote.removeClass('active');
  }, duration);
}

$(document).ready(function() {
  CANVAS_TOP = window.innerHeight / 2;

  var players = {};

  // view web socket
  var socket = new WebSocket('ws://localhost:8082/');
  socket.onmessage = function(evt) {
    var message = JSON.parse(evt.data);
    if (message.type === 'notes') {
      if (!players[message.id]) {
        // if player doesn't exist, create new player
        players[message.id] = message
        players[message.id].id = message.id
        var notes = [];
        var dir;
        message.notes.forEach(function(note, iter) {
          if (iter === 0) {
            dir = note.dir;
          }
          notes.push(note.midi)
        })
        players[message.id].notes = notes;
        players[message.id].player = new Player(players[message.id].id,
        {
          songTempo: message.tempo,
          songRate: TEMPOS[message.tempo],
          song: players[message.id].notes,
          color: message.color,
          dir: dir
        }, sendNote);
        players[message.id].player.stop();
        players[message.id].player.reset();
        if(QUANTIZE) {
          players[message.id].toStart = true;
        } else {
          players[message.id].player.start();
        }

      } else {
        // player exists already
        var notes = [];
        message.notes.forEach(function(note, iter) {
          if (iter === 0) {
            players[message.id].dir = note.dir
          }
          notes.push(note.midi)
        })
        players[message.id].player.stop();
        players[message.id].player.reset();
        if(QUANTIZE) {
          players[message.id].toStart = true;
        } else {
          players[message.id].player.start();
        }
        players[message.id].player.song = notes;
      }
    } else if (message.type === 'tempo') {
      players[message.id].player.tempo(message.tempo);
    } else if (message.type === 'start') {
      players[message.id].player.start();
    } else if (message.type === 'stop') {
      players[message.id].player.stop();
    } else if (message.type === 'close') {
      // remove player if they exist
      if (players[message.id]) {
        players[message.id].player.stop();
        players[message.id].player.remove();
        players[message.id] = null;
      }
    }
  };

  function sendNote(note, tempo) {
    // quarternote by default
    tempo = tempo || 1;
    console.log('note',note);
    // socket.send(JSON.stringify({note: note, tempo: tempo}));
  }


  /*
    INITIALIZE
   */
  createNotes(DEFAULT_BASE_NOTE, renderNotes);
  initializeSettings();

  /*
    Loop over players
   */
  var loopCount = 0;
  function loopPlayers() {
    for (var id in players) {
      if (!!players[id]) {
        // look for players to start
        if (players[id].toStart) {
          // reset timeout upon new input
          players[id].player.timeout = 0;
          players[id].toStart = false;
          players[id].player.start();
        }
        // look for inactive players every second
        if (loopCount >= 5) {
          loopCount = 0;
          // increase timeout every second
          players[id].player.timeout += 1;
          // remove player if no actions for more than 30 seconds
          if (players[id].player.timeout >= 1000) {
            players[id].player.stop();
            players[id].player.remove();
            players[id] = null;
          }
        }
      }
    }
    loopCount++;
  }

  // set interval at the shortest delimination of notes
  if (QUANTIZE) {
    setInterval(loopPlayers, TEMPOS[0]);
  }

  /*
    USER INPUT
   */
  $('.note').on('click', function(evt) {
    var note = $(this).attr("id");
    console.log('click');
    sendNote(notes[note].midi);
  });

  $('.note').hover(function(evt) {
    var note = $(this).attr("id");
    console.log('hover');
    sendNote(notes[note].midi);
  });
});

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
