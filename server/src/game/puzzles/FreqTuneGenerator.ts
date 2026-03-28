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

    // Shuffle targets for hint ordering
    const hintTargets = [...targets].sort(() => Math.random() - 0.5);

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { dialCount: count },

      getHint(hintIndex: number): string {
        if (hintIndex >= hintTargets.length) return 'これ以上のヒントはありません。';
        const t = hintTargets[hintIndex];
        return `ダイヤル${t.index + 1}の目標周波数は${t.frequency} MHzです。`;
      },

      getScanResult(): 'hot' | 'warm' | 'cold' {
        const ratio = tunedDials.size / count;
        if (ratio >= 0.75) return 'hot';
        if (ratio >= 0.25) return 'warm';
        return 'cold';
      },

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
        navigator: {
          targets: targets.map(t => ({
            dialIndex: t.index,
            label: `FREQ ${t.index + 1}: ${t.frequency} MHz ±${t.tolerance}`,
            frequency: t.frequency,
            tolerance: t.tolerance,
          })),
        },
        hacker: {
          targets: targets.map(t => ({
            dialIndex: t.index,
            label: `FREQ ${t.index + 1}: ${t.frequency} MHz ±${t.tolerance}`,
            frequency: t.frequency,
            tolerance: t.tolerance,
          })),
        },
      },
      timeLimit,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'tune') {
          return { correct: false, penalty: 0, feedback: '不明なアクション。' };
        }

        const { dialIndex, frequency } = action.data as { dialIndex: number; frequency: number };

        if (dialIndex == null || frequency == null) {
          return { correct: false, penalty: 0, feedback: 'ダイヤル番号または周波数が未指定。' };
        }

        if (dialIndex < 0 || dialIndex >= count) {
          return { correct: false, penalty: 0, feedback: '無効なダイヤル番号。' };
        }

        if (tunedDials.has(dialIndex)) {
          return { correct: false, penalty: 0, feedback: `ダイヤル${dialIndex + 1}は既にチューニング済み。` };
        }

        const target = targets[dialIndex];
        const diff = Math.abs(frequency - target.frequency);

        if (diff <= target.tolerance) {
          tunedDials.add(dialIndex);
          const solved = tunedDials.size === count;
          return {
            correct: true,
            penalty: 0,
            feedback: `ダイヤル${dialIndex + 1}を${frequency} MHzでロック。`,
            solved,
          };
        }

        // Incorrect — do NOT add to tunedDials so the operator can retry
        return {
          correct: false,
          penalty: 10,
          feedback: `ダイヤル${dialIndex + 1}: ${frequency} MHz -- 信号未取得。`,
        };
      },
    };

    return instance;
  }
}
