// ── STATIC ORBIT — Main Audio Engine (Singleton) ──
// Manages all game audio: BGM, SFX, heartbeat.
// All sounds are procedurally generated with Tone.js — no external samples.

import * as Tone from 'tone';
import { BGMManager } from './BGMManager';
import { SFXManager } from './SFXManager';
import type { BGMTrack, SFXName } from './types';

export class AudioEngine {
  private static instance: AudioEngine | null = null;

  private initialized = false;
  private masterVolume!: Tone.Volume;
  private bgmBus!: Tone.Volume;
  private sfxBus!: Tone.Volume;
  private bgmManager!: BGMManager;
  private sfxManager!: SFXManager;

  // Heartbeat state
  private heartbeatSynth: Tone.Synth | null = null;
  private heartbeatLoop: Tone.Loop | null = null;
  private heartbeatFilter: Tone.Filter | null = null;

  private constructor() {
    // Intentionally empty — real setup happens in init()
  }

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  /**
   * Initialise the audio context. MUST be called from a user-gesture handler
   * (click / tap / keydown) to satisfy browser autoplay policy.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // Resume / start the Tone.js audio context (handles autoplay policy)
    await Tone.start();

    // Routing: synths → bus → master → destination
    this.masterVolume = new Tone.Volume(0).toDestination();
    this.bgmBus = new Tone.Volume(0).connect(this.masterVolume);
    this.sfxBus = new Tone.Volume(0).connect(this.masterVolume);

    this.bgmManager = new BGMManager(this.bgmBus);
    this.sfxManager = new SFXManager(this.sfxBus);

    this.initialized = true;
  }

  // ─────────────── BGM ───────────────

  playBGM(track: BGMTrack): void {
    this.ensureInit();
    this.bgmManager.play(track);
  }

  stopBGM(fadeTime?: number): void {
    this.ensureInit();
    this.bgmManager.stop(fadeTime);
  }

  // ─────────────── SFX ───────────────

  playSFX(name: SFXName): void {
    this.ensureInit();
    this.sfxManager.play(name);
  }

  // ─────────────── Heartbeat ───────────────
  // Rhythmic low thump that intensifies tension during time-critical phases.

  playHeartbeat(): void {
    this.ensureInit();
    if (this.heartbeatLoop) return; // already playing

    this.heartbeatFilter = new Tone.Filter({
      type: 'lowpass',
      frequency: 150,
      rolloff: -24,
    }).connect(this.sfxBus);

    this.heartbeatSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.15 },
      volume: -6,
    }).connect(this.heartbeatFilter);

    // Double-beat pattern: thump-thump ... thump-thump ...
    let beatIndex = 0;
    this.heartbeatLoop = new Tone.Loop((time) => {
      const phase = beatIndex % 4;
      if (phase === 0 || phase === 1) {
        const freq = phase === 0 ? 55 : 45; // first beat slightly higher
        this.heartbeatSynth!.triggerAttackRelease(freq, '16n', time);
      }
      beatIndex++;
    }, '8n');

    this.heartbeatLoop.start();
    // Heartbeat runs on its own; Transport should already be started by BGM.
    // If not, start it.
    if (Tone.getTransport().state !== 'started') {
      Tone.getTransport().start();
    }
  }

  stopHeartbeat(): void {
    if (this.heartbeatLoop) {
      this.heartbeatLoop.stop();
      this.heartbeatLoop.dispose();
      this.heartbeatLoop = null;
    }
    if (this.heartbeatSynth) {
      this.heartbeatSynth.dispose();
      this.heartbeatSynth = null;
    }
    if (this.heartbeatFilter) {
      this.heartbeatFilter.dispose();
      this.heartbeatFilter = null;
    }
  }

  // ─────────────── Volume Controls ───────────────

  /** Set master volume (0 = unity, -Infinity = mute). Accepts dB values. */
  setMasterVolume(vol: number): void {
    this.ensureInit();
    this.masterVolume.volume.value = vol;
  }

  /** Set BGM bus volume in dB. */
  setBGMVolume(vol: number): void {
    this.ensureInit();
    this.bgmBus.volume.value = vol;
  }

  /** Set SFX bus volume in dB. */
  setSFXVolume(vol: number): void {
    this.ensureInit();
    this.sfxBus.volume.value = vol;
  }

  // ─────────────── Lifecycle ───────────────

  /** Tear down everything. Call when the app unmounts. */
  dispose(): void {
    if (!this.initialized) return;

    this.stopHeartbeat();
    this.bgmManager.dispose();
    this.sfxManager.dispose();

    Tone.getTransport().stop();
    Tone.getTransport().cancel();

    this.bgmBus.dispose();
    this.sfxBus.dispose();
    this.masterVolume.dispose();

    this.initialized = false;
    AudioEngine.instance = null;
  }

  // ─────────────── Helpers ───────────────

  private ensureInit(): void {
    if (!this.initialized) {
      console.warn(
        '[AudioEngine] Not initialized. Call AudioEngine.getInstance().init() ' +
        'from a user-gesture handler first.',
      );
    }
  }
}
