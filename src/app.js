import '../assets/styles.scss';
import $ from 'jquery';

import Player from './Player';

/*
  feature flags
 */

// counterpoint
//
var QUANTIZE = true;
var PORT_PLAYER = 8888;

// duplicate constants:
var TEMPOS = {
  0: 200,
  1: 400,
  2: 800
}
var CANVAS_TOP = null;
var DEFAULT_BASE_NOTE = 48;
var STEPS = 16;

var TEST_SONG = [7, 11, 9, 11, 7, 12, 10, 12];
var TEST_SONG_HARMONY = [4, 0, 2, 0, 4, 0, 2, 0, 5, 3, 4, 3, 5, 3, 4, 3];
var CLIMBING_SONG_1 = [0, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 8, 7, 9, 8, 10, 9, 11, 10, 12, 11, 13, 12, 14];
var CLIMBING_SONG_2 = [0, 2, 4, 6, 7, 9, 11, 13, 14];

var MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
var MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

var notes = [];

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
