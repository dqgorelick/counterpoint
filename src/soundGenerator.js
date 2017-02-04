import Tone from 'tone';

var vol = new Tone.Volume(12);
var freeverb = new Tone.Freeverb(0.7, 1200).toMaster();
var synth = new Tone.PolySynth(6, Tone.FMSynth, {
    "oscillator": {
        "partials": [0, 2, 3, 4, 8],
    },
    "envelope": {
        "attack": 0.25,
        "decay": 0.4
    },
    "volume": {
    }
}).chain(vol).connect(freeverb).toMaster();

export function triggerAttackRelease(note, tempo) {
  let noteLength = tempo || "8n";
  synth.triggerAttackRelease(note, noteLength);
}

