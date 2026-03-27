// ── React hook for easy audio integration ──

import { useCallback, useEffect } from 'react';
import { AudioEngine } from './AudioEngine';
import type { BGMTrack, SFXName } from './types';

/**
 * Provides stable callbacks for every AudioEngine action.
 * Safe to call before init — the engine will log a warning but won't crash.
 *
 * Usage:
 *   const { init, playBGM, playSFX } = useAudio();
 *   // Call init() once on first user interaction (click handler, etc.)
 */
export function useAudio() {
  const engine = AudioEngine.getInstance();

  const init = useCallback(async () => {
    await engine.init();
  }, [engine]);

  const playBGM = useCallback(
    (track: BGMTrack) => engine.playBGM(track),
    [engine],
  );

  const stopBGM = useCallback(
    (fadeTime?: number) => engine.stopBGM(fadeTime),
    [engine],
  );

  const playSFX = useCallback(
    (name: SFXName) => engine.playSFX(name),
    [engine],
  );

  const playHeartbeat = useCallback(() => engine.playHeartbeat(), [engine]);
  const stopHeartbeat = useCallback(() => engine.stopHeartbeat(), [engine]);

  const setMasterVolume = useCallback(
    (vol: number) => engine.setMasterVolume(vol),
    [engine],
  );

  const setBGMVolume = useCallback(
    (vol: number) => engine.setBGMVolume(vol),
    [engine],
  );

  const setSFXVolume = useCallback(
    (vol: number) => engine.setSFXVolume(vol),
    [engine],
  );

  // Clean up on unmount (only the very last component using this hook
  // should trigger disposal — the singleton handles this gracefully).
  useEffect(() => {
    return () => {
      // Don't dispose here — the singleton should persist across route changes.
      // Call engine.dispose() explicitly when the app truly unmounts.
    };
  }, []);

  return {
    init,
    playBGM,
    stopBGM,
    playSFX,
    playHeartbeat,
    stopHeartbeat,
    setMasterVolume,
    setBGMVolume,
    setSFXVolume,
  };
}
