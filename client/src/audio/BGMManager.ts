// ── Procedural BGM tracks for STATIC ORBIT ──
// All music is generated in real-time with Tone.js synths.
// Dark, industrial, cyberpunk atmosphere — Blade Runner 2049 / Alien: Isolation.

import * as Tone from 'tone';
import type { BGMTrack } from './types';

/** Holds all Tone nodes for a single BGM track so we can dispose them cleanly. */
interface TrackNodes {
  /* Loop | Sequence | Part — they share stop/dispose but no common TS base */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parts: any[];
  synths: Tone.ToneAudioNode[];
  effects: Tone.ToneAudioNode[];
}

export class BGMManager {
  private output: Tone.Volume;
  private currentTrack: BGMTrack | null = null;
  private nodes: TrackNodes | null = null;

  constructor(destination: Tone.ToneAudioNode) {
    this.output = new Tone.Volume(-2).connect(destination);
  }

  play(track: BGMTrack): void {
    if (this.currentTrack === track) return;
    this.stop(0.5);

    // Small delay to let the old track fade out
    setTimeout(() => {
      this.currentTrack = track;
      switch (track) {
        case 'title':
          this.nodes = this.buildTitle();
          break;
        case 'infiltration':
          this.nodes = this.buildInfiltration();
          break;
        case 'escape':
          this.nodes = this.buildEscape();
          break;
        case 'result':
          this.nodes = this.buildResult();
          break;
      }
      Tone.getTransport().start();
    }, 550);
  }

  stop(fadeTime = 1.0): void {
    if (!this.nodes) return;
    // Fade master out, then dispose everything
    this.output.volume.linearRampTo(-Infinity, fadeTime);
    const nodesToDispose = this.nodes;
    this.nodes = null;
    this.currentTrack = null;

    setTimeout(() => {
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
      this.disposeNodes(nodesToDispose);
      this.output.volume.value = -2;
    }, fadeTime * 1000 + 100);
  }

  // ─────────────────────────── TITLE ───────────────────────────
  // Dark ambient pad, bass drone in D minor, occasional radar pings
  // ~70 BPM — eerie, vast, cold space
  private buildTitle(): TrackNodes {
    const transport = Tone.getTransport();
    transport.bpm.value = 70;

    const synths: Tone.ToneAudioNode[] = [];
    const effects: Tone.ToneAudioNode[] = [];
    const parts: TrackNodes['parts'] = [];

    // ── Dark ambient pad: low-pass filtered saw, slow LFO ──
    const padFilter = new Tone.Filter({
      type: 'lowpass',
      frequency: 400,
      rolloff: -24,
    }).connect(this.output);
    effects.push(padFilter);

    const padReverb = new Tone.Reverb({ decay: 8, wet: 0.7 }).connect(padFilter);
    effects.push(padReverb);

    const padLFO = new Tone.LFO({
      frequency: 0.05, // very slow
      min: 200,
      max: 600,
    }).start();
    padLFO.connect(padFilter.frequency);
    effects.push(padLFO);

    const pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 4, decay: 2, sustain: 0.6, release: 4 },
      volume: -18,
    }).connect(padReverb);
    synths.push(pad);

    // Play a D-minor chord that sustains and loops
    const padLoop = new Tone.Loop((time) => {
      pad.triggerAttackRelease(['D3', 'F3', 'A3'], '4m', time);
    }, '4m');
    padLoop.start(0);
    parts.push(padLoop);

    // ── Subtle bass drone ──
    const bassFilter = new Tone.Filter({
      type: 'lowpass',
      frequency: 120,
      rolloff: -12,
    }).connect(this.output);
    effects.push(bassFilter);

    const bass = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 3, decay: 1, sustain: 0.8, release: 3 },
      volume: -12,
    }).connect(bassFilter);
    synths.push(bass);

    const bassLoop = new Tone.Loop((time) => {
      bass.triggerAttackRelease('D1', '4m', time);
    }, '4m');
    bassLoop.start(0);
    parts.push(bassLoop);

    // ── Occasional radar ping every 4-8 bars (randomised within that range) ──
    const pingReverb = new Tone.Reverb({ decay: 4, wet: 0.8 }).connect(this.output);
    effects.push(pingReverb);

    const pingDelay = new Tone.FeedbackDelay({
      delayTime: '8n.',
      feedback: 0.3,
      wet: 0.4,
    }).connect(pingReverb);
    effects.push(pingDelay);

    const ping = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.002, decay: 0.3, sustain: 0, release: 0.5 },
      volume: -16,
    }).connect(pingDelay);
    synths.push(ping);

    const pingLoop = new Tone.Loop((time) => {
      // Random pitch from a small set for variation
      const notes = ['A6', 'E6', 'D6', 'F#6'];
      const note = notes[Math.floor(Math.random() * notes.length)];
      ping.triggerAttackRelease(note, '16n', time);
    }, '6m'); // approximately every 5-6 bars
    pingLoop.start('4m'); // first ping after 4 bars
    parts.push(pingLoop);

    return { parts, synths, effects };
  }

  // ─────────────────────────── INFILTRATION ───────────────────────────
  // Minimal techno beat, dark bass synth line in D minor, filtered pad
  // ~110 BPM — stealthy, focused, tension building
  private buildInfiltration(): TrackNodes {
    const transport = Tone.getTransport();
    transport.bpm.value = 110;

    const synths: Tone.ToneAudioNode[] = [];
    const effects: Tone.ToneAudioNode[] = [];
    const parts: TrackNodes['parts'] = [];

    // ── Drum bus ──
    const drumBus = new Tone.Volume(-4).connect(this.output);
    effects.push(drumBus);

    // ── Deep kick on 1 and 3 ──
    const kickFilter = new Tone.Filter({
      type: 'lowpass',
      frequency: 200,
    }).connect(drumBus);
    effects.push(kickFilter);

    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.15 },
      volume: -6,
    }).connect(kickFilter);
    synths.push(kick);

    const kickLoop = new Tone.Sequence(
      (time, step) => {
        if (step === 0 || step === 2) {
          kick.triggerAttackRelease('C1', '8n', time);
        }
      },
      [0, 1, 2, 3],
      '4n',
    );
    kickLoop.start(0);
    kickLoop.loop = true;
    parts.push(kickLoop);

    // ── Hi-hat pattern: 8ths with some 16th ghost notes ──
    const hatFilter = new Tone.Filter({
      type: 'highpass',
      frequency: 7000,
    }).connect(drumBus);
    effects.push(hatFilter);

    const hat = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.02 },
      volume: -18,
    }).connect(hatFilter);
    synths.push(hat);

    // Pattern: x = normal hit, g = ghost note (quieter), . = silence
    // Gives a flowing 16th-note feel with emphasis on 8ths
    const hatPattern = ['x', 'g', 'x', '.', 'x', 'g', 'x', 'g',
                        'x', '.', 'x', 'g', 'x', '.', 'x', 'g'];
    const hatLoop = new Tone.Sequence(
      (time, step) => {
        if (step === 'x') {
          hat.triggerAttackRelease('32n', time);
        } else if (step === 'g') {
          // Ghost note — quieter
          hat.volume.setValueAtTime(-24, time);
          hat.triggerAttackRelease('64n', time);
          hat.volume.setValueAtTime(-18, time + 0.05);
        }
      },
      hatPattern,
      '16n',
    );
    hatLoop.start(0);
    hatLoop.loop = true;
    parts.push(hatLoop);

    // ── Dark bass synth line: D2 F2 A2 G2, repeating ──
    const bassFilter = new Tone.Filter({
      type: 'lowpass',
      frequency: 500,
      rolloff: -24,
    }).connect(this.output);
    effects.push(bassFilter);

    const bassLFO = new Tone.LFO({
      frequency: 0.25,
      min: 300,
      max: 700,
    }).start();
    bassLFO.connect(bassFilter.frequency);
    effects.push(bassLFO);

    const bass = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.2 },
      volume: -10,
    }).connect(bassFilter);
    synths.push(bass);

    const bassSeq = new Tone.Sequence(
      (time, note) => {
        if (note) bass.triggerAttackRelease(note, '4n', time);
      },
      ['D2', 'F2', 'A2', 'G2'],
      '2n',
    );
    bassSeq.start(0);
    bassSeq.loop = true;
    parts.push(bassSeq);

    // ── Filtered atmospheric pad ──
    const padReverb = new Tone.Reverb({ decay: 6, wet: 0.6 }).connect(this.output);
    effects.push(padReverb);

    const padFilter2 = new Tone.Filter({
      type: 'lowpass',
      frequency: 600,
      rolloff: -24,
    }).connect(padReverb);
    effects.push(padFilter2);

    const pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 2, decay: 1, sustain: 0.5, release: 2 },
      volume: -22,
    }).connect(padFilter2);
    synths.push(pad);

    const padLoop = new Tone.Loop((time) => {
      pad.triggerAttackRelease(['D3', 'A3', 'F4'], '2m', time);
    }, '2m');
    padLoop.start(0);
    parts.push(padLoop);

    return { parts, synths, effects };
  }

  // ─────────────────────────── ESCAPE ───────────────────────────
  // Aggressive beat, intense bass, alarm stabs, distorted pad
  // ~140 BPM — panic, urgency, chaos
  private buildEscape(): TrackNodes {
    const transport = Tone.getTransport();
    transport.bpm.value = 140;

    const synths: Tone.ToneAudioNode[] = [];
    const effects: Tone.ToneAudioNode[] = [];
    const parts: TrackNodes['parts'] = [];

    // ── Drum bus with slight distortion ──
    const drumDist = new Tone.Distortion({ distortion: 0.3 }).connect(this.output);
    effects.push(drumDist);

    const drumBus = new Tone.Volume(-3).connect(drumDist);
    effects.push(drumBus);

    // ── Distorted kick every beat ──
    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.04,
      octaves: 8,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 },
      volume: -6,
    }).connect(drumBus);
    synths.push(kick);

    const kickLoop = new Tone.Loop((time) => {
      kick.triggerAttackRelease('C1', '8n', time);
    }, '4n');
    kickLoop.start(0);
    parts.push(kickLoop);

    // ── Snappy snare on 2 & 4 ──
    const snareFilter = new Tone.Filter({
      type: 'bandpass',
      frequency: 3000,
      Q: 2,
    }).connect(drumBus);
    effects.push(snareFilter);

    const snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.06 },
      volume: -8,
    }).connect(snareFilter);
    synths.push(snare);

    const snareBody = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
      volume: -14,
    }).connect(drumBus);
    synths.push(snareBody);

    const snareLoop = new Tone.Sequence(
      (time, step) => {
        if (step === 1 || step === 3) {
          snare.triggerAttackRelease('16n', time);
          snareBody.triggerAttackRelease(200, '16n', time);
        }
      },
      [0, 1, 2, 3],
      '4n',
    );
    snareLoop.start(0);
    snareLoop.loop = true;
    parts.push(snareLoop);

    // ── Rapid 16th hi-hats ──
    const hatFilter = new Tone.Filter({
      type: 'highpass',
      frequency: 8000,
    }).connect(drumBus);
    effects.push(hatFilter);

    const hat = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.025, sustain: 0, release: 0.01 },
      volume: -18,
    }).connect(hatFilter);
    synths.push(hat);

    const hatLoop = new Tone.Loop((time) => {
      hat.triggerAttackRelease('64n', time);
    }, '16n');
    hatLoop.start(0);
    parts.push(hatLoop);

    // ── Intense bass — fast, syncopated, with filter sweeps ──
    const bassFilter = new Tone.Filter({
      type: 'lowpass',
      frequency: 800,
      rolloff: -24,
    }).connect(this.output);
    effects.push(bassFilter);

    const bassFilterLFO = new Tone.LFO({
      frequency: '2m',
      min: 300,
      max: 1200,
    }).start();
    bassFilterLFO.connect(bassFilter.frequency);
    effects.push(bassFilterLFO);

    const bass = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.005, decay: 0.15, sustain: 0.3, release: 0.1 },
      volume: -8,
    }).connect(bassFilter);
    synths.push(bass);

    // Syncopated 16th-note bass pattern
    const bassNotes = [
      'D2', null, 'D2', 'D2',
      null, 'F2', null, 'F2',
      'A1', null, 'A1', 'G1',
      null, 'G1', 'A1', null,
    ];
    const bassSeq = new Tone.Sequence(
      (time, note) => {
        if (note) bass.triggerAttackRelease(note, '16n', time);
      },
      bassNotes,
      '16n',
    );
    bassSeq.start(0);
    bassSeq.loop = true;
    parts.push(bassSeq);

    // ── Alarm-like synth stab every 2 bars ──
    const alarmReverb = new Tone.Reverb({ decay: 1.5, wet: 0.3 }).connect(this.output);
    effects.push(alarmReverb);

    const alarm = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.1 },
      volume: -16,
    }).connect(alarmReverb);
    synths.push(alarm);

    const alarmLoop = new Tone.Loop((time) => {
      alarm.triggerAttackRelease('A5', '32n', time);
      alarm.triggerAttackRelease('A5', '32n', time + 0.06);
    }, '2m');
    alarmLoop.start(0);
    parts.push(alarmLoop);

    // ── Distorted pad underneath ──
    const padDist = new Tone.Distortion({ distortion: 0.4 }).connect(this.output);
    effects.push(padDist);

    const padFilter2 = new Tone.Filter({
      type: 'lowpass',
      frequency: 500,
      rolloff: -24,
    }).connect(padDist);
    effects.push(padFilter2);

    const pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 2, decay: 1, sustain: 0.5, release: 2 },
      volume: -24,
    }).connect(padFilter2);
    synths.push(pad);

    const padLoop = new Tone.Loop((time) => {
      pad.triggerAttackRelease(['D3', 'F3', 'A3'], '2m', time);
    }, '2m');
    padLoop.start(0);
    parts.push(padLoop);

    return { parts, synths, effects };
  }

  // ─────────────────────────── RESULT ───────────────────────────
  // Melancholic FM-piano, Dm Bb F C progression, reverb pad, no drums
  // ~80 BPM — reflective, bittersweet, cool-down
  private buildResult(): TrackNodes {
    const transport = Tone.getTransport();
    transport.bpm.value = 80;

    const synths: Tone.ToneAudioNode[] = [];
    const effects: Tone.ToneAudioNode[] = [];
    const parts: TrackNodes['parts'] = [];

    // ── Piano-like FM synth ──
    const pianoReverb = new Tone.Reverb({ decay: 5, wet: 0.5 }).connect(this.output);
    effects.push(pianoReverb);

    const piano = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3,
      modulationIndex: 1.5,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 1.5, sustain: 0.1, release: 2.0 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.01, decay: 0.8, sustain: 0.2, release: 1.5 },
      volume: -10,
    }).connect(pianoReverb);
    synths.push(piano);

    // Chord progression: Dm -> Bb -> F -> C (each chord 2 bars = 8 beats)
    // Using arpeggiated voicings for a more musical feel
    const chordProg = [
      { notes: ['D4', 'F4', 'A4'],     time: '0:0' },   // Dm
      { notes: ['Bb3', 'D4', 'F4'],    time: '2:0' },   // Bb
      { notes: ['F3', 'A3', 'C4'],     time: '4:0' },   // F
      { notes: ['C4', 'E4', 'G4'],     time: '6:0' },   // C
    ];

    const chordPart = new Tone.Part((time, value) => {
      // Play chord as a gentle arpeggio
      const { notes } = value as { notes: string[] };
      notes.forEach((note, i) => {
        piano.triggerAttackRelease(note, '1m', time + i * 0.08);
      });
    }, chordProg);
    chordPart.loop = true;
    chordPart.loopEnd = '8:0';
    chordPart.start(0);
    parts.push(chordPart);

    // Add some single melodic notes between chords
    const melodyNotes = [
      { note: 'A4', time: '0:3' },
      { note: 'G4', time: '1:1' },
      { note: 'F4', time: '2:3' },
      { note: 'D4', time: '3:1' },
      { note: 'C4', time: '4:3' },
      { note: 'A3', time: '5:2' },
      { note: 'G4', time: '6:2' },
      { note: 'E4', time: '7:1' },
    ];

    const melodyPart = new Tone.Part((time, value) => {
      const { note } = value as { note: string };
      piano.triggerAttackRelease(note, '2n', time);
    }, melodyNotes);
    melodyPart.loop = true;
    melodyPart.loopEnd = '8:0';
    melodyPart.start('1:0'); // start after 1 bar for a staggered entrance
    parts.push(melodyPart);

    // ── Subtle reverb-heavy pad ──
    const padReverb = new Tone.Reverb({ decay: 10, wet: 0.8 }).connect(this.output);
    effects.push(padReverb);

    const padFilter = new Tone.Filter({
      type: 'lowpass',
      frequency: 500,
      rolloff: -24,
    }).connect(padReverb);
    effects.push(padFilter);

    const pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 3, decay: 1, sustain: 0.5, release: 3 },
      volume: -22,
    }).connect(padFilter);
    synths.push(pad);

    const padChords = [
      { notes: ['D3', 'A3'],  time: '0:0' },
      { notes: ['Bb2', 'F3'], time: '2:0' },
      { notes: ['F2', 'C3'],  time: '4:0' },
      { notes: ['C3', 'G3'],  time: '6:0' },
    ];

    const padPart = new Tone.Part((time, value) => {
      const { notes } = value as { notes: string[] };
      pad.triggerAttackRelease(notes, '2m', time);
    }, padChords);
    padPart.loop = true;
    padPart.loopEnd = '8:0';
    padPart.start(0);
    parts.push(padPart);

    return { parts, synths, effects };
  }

  // ─────────────────────────── Cleanup ───────────────────────────

  private disposeNodes(nodes: TrackNodes): void {
    nodes.parts.forEach((p) => {
      try { p.stop(); p.dispose(); } catch { /* already disposed */ }
    });
    nodes.synths.forEach((s) => {
      try { s.dispose(); } catch { /* already disposed */ }
    });
    nodes.effects.forEach((e) => {
      try { e.dispose(); } catch { /* already disposed */ }
    });
  }

  dispose(): void {
    this.stop(0);
    this.output.dispose();
  }
}
