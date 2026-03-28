// ===== STATIC ORBIT — Signal Relay Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';
import { TIME_LIMITS } from './PuzzleGenerator.js';

type WaveType = 'sine' | 'square' | 'triangle' | 'sawtooth';

interface WaveTarget {
  index: number;
  waveType: WaveType;
  frequency: number;
  amplitude: number;
}

const WAVE_TYPES: WaveType[] = ['sine', 'square', 'triangle', 'sawtooth'];

function waveCountForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 2;
    case 'normal': return 3;
    case 'hard': return 4;
    case 'extreme': return 4;
  }
}

function freqToleranceForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 2;
    case 'normal': return 1;
    case 'hard': return 1;
    case 'extreme': return 1;
  }
}

function ampToleranceForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 0.25;
    case 'normal': return 0.15;
    case 'hard': return 0.15;
    case 'extreme': return 0.15;
  }
}

function randomFrequency(): number {
  return Math.floor(Math.random() * 10) + 1; // 1-10
}

function randomAmplitude(): number {
  return Math.round((Math.random() * 0.8 + 0.2) * 100) / 100; // 0.2-1.0
}

export class SignalRelayGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'signal-relay';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const count = waveCountForDifficulty(difficulty);
    const freqTol = freqToleranceForDifficulty(difficulty);
    const ampTol = ampToleranceForDifficulty(difficulty);

    const targets: WaveTarget[] = Array.from({ length: count }, (_, i) => ({
      index: i,
      waveType: WAVE_TYPES[Math.floor(Math.random() * WAVE_TYPES.length)],
      frequency: randomFrequency(),
      amplitude: randomAmplitude(),
    }));

    const matchedWaves = new Set<number>();
    const timeLimit = TIME_LIMITS[difficulty];

    const observerData = {
      targets: targets.map(t => ({
        index: t.index,
        waveType: t.waveType,
        frequency: t.frequency,
        amplitude: t.amplitude,
      })),
    };

    const operatorData = {
      waveCount: count,
      availableTypes: [...WAVE_TYPES],
    };

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { waveCount: count },
      roleData: {
        observer: observerData,
        operator: operatorData,
        navigator: observerData,
        hacker: observerData,
      },
      timeLimit,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'match-wave') {
          return { correct: false, penalty: 0, feedback: '不明なアクション。' };
        }

        const { index, waveType, frequency, amplitude } = action.data as {
          index: number;
          waveType: string;
          frequency: number;
          amplitude: number;
        };

        if (index == null || waveType == null || frequency == null || amplitude == null) {
          return { correct: false, penalty: 0, feedback: 'パラメータが不足しています。' };
        }

        if (index < 0 || index >= count) {
          return { correct: false, penalty: 0, feedback: '無効な波形インデックス。' };
        }

        if (matchedWaves.has(index)) {
          return { correct: false, penalty: 0, feedback: `波形${index + 1}は既にマッチ済み。` };
        }

        const target = targets[index];

        if (waveType !== target.waveType) {
          return { correct: false, penalty: 10, feedback: `波形${index + 1}: 波形タイプが一致しません。` };
        }

        if (Math.abs(frequency - target.frequency) > freqTol) {
          return { correct: false, penalty: 10, feedback: `波形${index + 1}: 周波数がずれています。` };
        }

        if (Math.abs(amplitude - target.amplitude) > ampTol) {
          return { correct: false, penalty: 10, feedback: `波形${index + 1}: 振幅がずれています。` };
        }

        matchedWaves.add(index);
        const solved = matchedWaves.size === count;
        return {
          correct: true,
          penalty: 0,
          feedback: `波形${index + 1}をマッチ完了。`,
          solved,
        };
      },
    };

    return instance;
  }
}
