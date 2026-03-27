// ── Synthesized sound effects for STATIC ORBIT ──
// All sounds are generated procedurally via Tone.js — no samples.

import * as Tone from 'tone';
import type { SFXName } from './types';

export class SFXManager {
  private output: Tone.Volume;
  private reverb: Tone.Reverb;

  constructor(destination: Tone.ToneAudioNode) {
    this.output = new Tone.Volume(0).connect(destination);
    this.reverb = new Tone.Reverb({ decay: 1.2, wet: 0.3 }).connect(this.output);
  }

  play(name: SFXName): void {
    switch (name) {
      case 'click':
        this.playClick();
        break;
      case 'correct':
        this.playCorrect();
        break;
      case 'incorrect':
        this.playIncorrect();
        break;
      case 'stageCleared':
        this.playStageCleared();
        break;
      case 'stageFailed':
        this.playStageFailed();
        break;
      case 'warning':
        this.playWarning();
        break;
      case 'alert':
        this.playAlert();
        break;
      case 'phaseChange':
        this.playPhaseChange();
        break;
      case 'countdown':
        this.playCountdown();
        break;
      case 'typing':
        this.playTyping();
        break;
      case 'connect':
        this.playConnect();
        break;
    }
  }

  /** Short metallic tick — high-frequency noise burst, 20ms, band-pass filtered */
  private playClick(): void {
    const filter = new Tone.Filter({
      type: 'bandpass',
      frequency: 4000,
      Q: 8,
    }).connect(this.output);

    const noise = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.01 },
      volume: -8,
    }).connect(filter);

    noise.triggerAttackRelease('32n');
    this.scheduleDispose([noise, filter], 0.2);
  }

  /** Ascending two-tone chime — sine wave C5 to E5, 150ms, with reverb tail */
  private playCorrect(): void {
    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.15, sustain: 0, release: 0.3 },
      volume: -10,
    }).connect(this.reverb);

    const now = Tone.now();
    synth.triggerAttackRelease('C5', '16n', now);
    synth.triggerAttackRelease('E5', '16n', now + 0.08);
    this.scheduleDispose([synth], 1.0);
  }

  /** Low buzzer — square wave drop from A3 to E2, 200ms, with distortion */
  private playIncorrect(): void {
    const dist = new Tone.Distortion({ distortion: 0.6 }).connect(this.output);
    const synth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 },
      volume: -14,
    }).connect(dist);

    const now = Tone.now();
    synth.triggerAttackRelease('A3', '8n', now);
    synth.frequency.linearRampTo('E2', 0.2, now);
    this.scheduleDispose([synth, dist], 0.8);
  }

  /** Triumphant arpeggio C5-E5-G5-C6 followed by sustained chord */
  private playStageCleared(): void {
    const bigReverb = new Tone.Reverb({ decay: 2.5, wet: 0.5 }).connect(this.output);
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 1.0 },
      volume: -10,
    }).connect(bigReverb);

    const now = Tone.now();
    const notes = ['C5', 'E5', 'G5', 'C6'];
    notes.forEach((note, i) => {
      synth.triggerAttackRelease(note, '8n', now + i * 0.08);
    });
    // Sustained chord after arpeggio
    synth.triggerAttackRelease(['C5', 'E5', 'G5'], '2n', now + 0.4);
    this.scheduleDispose([synth, bigReverb], 4.0);
  }

  /** Dark descending — filtered noise + low sine sweep down, 500ms, heavy reverb */
  private playStageFailed(): void {
    const bigReverb = new Tone.Reverb({ decay: 3.0, wet: 0.6 }).connect(this.output);
    const filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 2000,
    }).connect(bigReverb);

    const noise = new Tone.NoiseSynth({
      noise: { type: 'brown' },
      envelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 0.3 },
      volume: -10,
    }).connect(filter);

    const sine = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 0.5 },
      volume: -8,
    }).connect(bigReverb);

    const now = Tone.now();
    noise.triggerAttackRelease('4n', now);
    filter.frequency.linearRampTo(200, 0.5, now);
    sine.triggerAttackRelease('A3', '4n', now);
    sine.frequency.linearRampTo('D2', 0.5, now);

    this.scheduleDispose([noise, sine, filter, bigReverb], 4.0);
  }

  /** Short alert beep — triangle wave 880Hz, 100ms, double-hit */
  private playWarning(): void {
    const synth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.05 },
      volume: -8,
    }).connect(this.output);

    const now = Tone.now();
    synth.triggerAttackRelease(880, '32n', now);
    synth.triggerAttackRelease(880, '32n', now + 0.12);
    this.scheduleDispose([synth], 0.6);
  }

  /** Alarm klaxon — alternating 600Hz/800Hz square waves, 500ms */
  private playAlert(): void {
    const filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 3000,
    }).connect(this.output);

    const synth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.05, sustain: 0.8, release: 0.05 },
      volume: -14,
    }).connect(filter);

    const now = Tone.now();
    synth.triggerAttackRelease(600, 0.12, now);
    synth.triggerAttackRelease(800, 0.12, now + 0.13);
    synth.triggerAttackRelease(600, 0.12, now + 0.26);
    synth.triggerAttackRelease(800, 0.12, now + 0.39);
    this.scheduleDispose([synth, filter], 1.0);
  }

  /** Deep impact — low boom + metallic crash + reverse reverb tail feel */
  private playPhaseChange(): void {
    const bigReverb = new Tone.Reverb({ decay: 4.0, wet: 0.7 }).connect(this.output);
    const bpFilter = new Tone.Filter({
      type: 'bandpass',
      frequency: 1500,
      Q: 3,
    }).connect(bigReverb);

    // Low boom
    const boom = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 1.5, sustain: 0, release: 0.5 },
      volume: -4,
    }).connect(bigReverb);

    // Metallic crash (noise burst, band-pass)
    const crash = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.2 },
      volume: -10,
    }).connect(bpFilter);

    // Reverse-swell feel: a sine that fades IN over ~0.8s then cuts
    const swell = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.8, decay: 0.01, sustain: 0, release: 0.2 },
      volume: -12,
    }).connect(bigReverb);

    const now = Tone.now();
    // Swell starts slightly before the hit for a "reverse reverb" feel
    swell.triggerAttackRelease('D3', '2n', now);
    boom.triggerAttackRelease(40, '2n', now + 0.3);
    crash.triggerAttackRelease('4n', now + 0.3);

    this.scheduleDispose([boom, crash, swell, bpFilter, bigReverb], 5.0);
  }

  /** Single tick — sine 1kHz, 50ms, clean */
  private playCountdown(): void {
    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
      volume: -6,
    }).connect(this.output);

    synth.triggerAttackRelease(1000, '32n');
    this.scheduleDispose([synth], 0.3);
  }

  /** Keyboard click — noise burst, very short (10ms), high-pass filtered */
  private playTyping(): void {
    const hpFilter = new Tone.Filter({
      type: 'highpass',
      frequency: 3000,
    }).connect(this.output);

    const noise = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.01, sustain: 0, release: 0.005 },
      volume: -12,
    }).connect(hpFilter);

    noise.triggerAttackRelease('64n');
    this.scheduleDispose([noise, hpFilter], 0.2);
  }

  /** Wire plug sound — short noise + sine blip at 2kHz, 80ms */
  private playConnect(): void {
    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.05 },
      volume: -8,
    }).connect(this.reverb);

    const hpFilter = new Tone.Filter({
      type: 'highpass',
      frequency: 2000,
    }).connect(this.reverb);

    const noise = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 },
      volume: -10,
    }).connect(hpFilter);

    const now = Tone.now();
    noise.triggerAttackRelease('64n', now);
    synth.triggerAttackRelease(2000, '16n', now + 0.015);
    this.scheduleDispose([synth, noise, hpFilter], 0.5);
  }

  /** Schedule disposal of Tone nodes to prevent memory leaks */
  private scheduleDispose(nodes: Tone.ToneAudioNode[], afterSeconds: number): void {
    setTimeout(() => {
      nodes.forEach((n) => {
        try {
          n.dispose();
        } catch {
          // Node may already be disposed
        }
      });
    }, afterSeconds * 1000);
  }

  dispose(): void {
    this.reverb.dispose();
    this.output.dispose();
  }
}
