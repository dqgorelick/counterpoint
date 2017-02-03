import $ from 'jquery';

// create the note objects
export function createNotes(notes, baseNote, steps, scale, top) {
  console.log('top',top);
  var maxWidth = window.innerWidth;
  for (var i = 0; i < steps; i++) {
    var noteWidth = maxWidth / steps;
    notes[i] = {
      id: i,
      midi: baseNote + (i < 7 ? 0 : (i > 13 ? 24 : 12)) + scale[(i % scale.length)],
      left: noteWidth * i,
      width: noteWidth,
      height: noteWidth / 2,
      top: noteWidth / 4,
      center: noteWidth * i + noteWidth / 2
    }
  }
  renderNotes(notes, steps, top);
}

export function renderNotes(notes, steps, top) {
  var noteHeight;
  $('#canvas').html(
    (function() {
      var notesHTML = '';
      notes.forEach(function(note, iter) {
        var color = parseInt((180 * (iter / steps) + 60)).toString(16);
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
      console.log('top',top);
      return (
        '<div class="scale-background"' +
        'style="' +
        'top:' + top + 'px;' +
        'height:' + noteHeight + 'px;' +
        '" ' +
        '></div>'
      )
    })()
  )
}

export function initializeSettings(top) {
  console.log('top',top);
  $('.note').css('top', top);
}

export function animateNote(note, duration) {
  // note transition
  var activeNote = $('#' + note);
  activeNote.addClass('active');
  setTimeout(function() {
    activeNote.removeClass('active');
  }, duration);
}
