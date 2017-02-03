var DEFAULT_BASE_NOTE = 48;
var DEFAULT_SONG_RATE = 450;

var MODES = { player: 1, song: 2 };

var TEMPOS = {
  0: 200,
  1: 400,
  2: 800
}

var CURSOR_WIDTH = 26;
var CW = 1;
var CCW = -1;
var CURSOR_LEFT = 0;
var CURSOR_RIGHT = 1;
var STEPS = 16;
var NOTE_DURATION = 200; // 0.2 second delay set in SuperCollider

export default class Player {
  constructor(id, options, sendNote) {
    this.id = id;
    this.baseNote = options.baseNote || DEFAULT_BASE_NOTE;
    this.songRate = options.songRate || DEFAULT_SONG_RATE;
    this.songTempo = options.songTempo || 1;
    this.canvasTop = options.canvasTop;
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

  tempo(tempoValue) {
    this.songTempo = tempoValue;
    this.songRate = TEMPOS[tempoValue];
    this.jQuery.css('-webkit-transition', '-webkit-transform ' + this.songRate + 'ms linear');
    this.jQuery.css('transition', 'transform ' + this.songRate + 'ms linear');
  }

  start() {
    if (!this.playing) {
      this.playNextNote();
      this.playing = true;
    }
  }

  playNextNote() {
    var self = this;
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
        // TODO: fix this
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
      // animateNote(current, 150);
    }

    // render cursor
    self.render();

    // recursive call at SONG_RATE
    self.meter = setTimeout(playNextNote, self.songRate);
    self.songIndex++;
    if (self.songIndex === self.song.length) self.songIndex = 0;
  }

  render() {
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
    var top = this.canvasTop + this.leftHand.width / 4 - diameter / 2;
    var left = this.leftHand.center;
    this.jQuery.css('top', top);
    this.jQuery.css('left', left);
    this.jQuery.css('height', diameter);
    this.jQuery.css('width', diameter);
  }
  stop() {
    clearTimeout(this.meter);
    this.playing = false;
  }

  remove() {
    $('#' + this.id).remove();
  }

  reset() {
    this.lastNote = null;
    this.leftHand = null;
    this.rightHand = null;
    this.songIndex = 0;
    this.meter = null;
    this.toFlip = false;
    this.rotationCount = this.rotationCount + (this.rotationCount % 2 ? 1 : 0);
  }
}



