// ===== STATIC ORBIT — Freq Tune Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';
import { TIME_LIMITS } from './PuzzleGenerator.js';

interface FreqTarget {
  index: number;
  frequency: number;
  tolerance: number;
}

function targetCountForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 2;
    case 'normal': return 3;
    case 'hard': return 4;
    case 'extreme': return 4;
  }
}

function toleranceForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 50;
    case 'normal': return 30;
    case 'hard': return 15;
    case 'extreme': return 8;
  }
}

function randomFrequency(): number {
  return Math.floor(Math.random() * 900) + 100; // 100-999
}

export class FreqTuneGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'freq-tune';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const count = targetCountForDifficulty(difficulty);
    const tolerance = toleranceForDifficulty(difficulty);

    const targets: FreqTarget[] = Array.from({ length: count }, (_, i) => ({
      index: i,
      frequency: randomFrequency(),
      tolerance,
    }));

    // Track which dials have been tuned correctly
    const tunedDials = new Set<number>();

    const timeLimit = TIME_LIMITS[difficulty];

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { dialCount: count },
      roleData: {
        observer: {
          targets: targets.map(t => ({
            dialIndex: t.index,
            label: `FREQ ${t.index + 1}: ${t.frequency} MHz ±${t.tolerance}`,
            frequency: t.frequency,
            tolerance: t.tolerance,
          })),
        },
        operator: {
          dialCount: count,
          frequencyMin: 100,
          frequencyMax: 999,
          dials: targets.map(t => ({
            dialIndex: t.index,
            label: `DIAL ${t.index + 1}`,
          })),
        },
      },
      timeLimit,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'tune') {
          return { correct: false, penalty: 0, feedback: 'Unknown action.' };
        }

        const { dialIndex, frequency } = action.data as { dialIndex: number; frequency: number };

        if (dialIndex == null || frequency == null) {
          return { correct: false, penalty: 0, feedback: 'Missing dial index or frequency.' };
        }

        if (dialIndex < 0 || dialIndex >= count) {
          return { correct: false, penalty: 0, feedback: 'Invalid dial index.' };
        }

        if (tunedDials.has(dialIndex)) {
          return { correct: false, penalty: 0, feedback: `Dial ${dialIndex + 1} is already tuned.` };
        }

        const target = targets[dialIndex];
        const diff = Math.abs(frequency - target.frequency);

        if (diff <= target.tolerance) {
          tunedDials.add(dialIndex);
          const solved = tunedDials.size === count;
          return {
            correct: true,
            penalty: 0,
            feedback: `Dial ${dialIndex + 1} locked at ${frequency} MHz.`,
            solved,
          };
        }

        return {
          correct: false,
          penalty: 10,
          feedback: `Dial ${dialIndex + 1}: ${frequency} MHz — signal not acquired.`,
        };
      },
    };

    return instance;
  }
}
