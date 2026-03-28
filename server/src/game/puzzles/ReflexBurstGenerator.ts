// ===== STATIC ORBIT — Reflex Burst Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';
import { TIME_LIMITS } from './PuzzleGenerator.js';

const AVAILABLE_KEYS = ['W', 'A', 'S', 'D', 'J', 'K', 'L'] as const;

interface BeatCommand {
  key: string;
  isFake: boolean;
  beatIndex: number;
}

function sequenceLength(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 6;
    case 'normal': return 10;
    case 'hard': return 15;
    case 'extreme': return 20;
  }
}

function tempo(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 1500;
    case 'normal': return 1000;
    case 'hard': return 700;
    case 'extreme': return 500;
  }
}

function fakeCount(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 0;
    case 'normal': return 0;
    case 'hard': return 3;
    case 'extreme': return 5;
  }
}

function randomKey(): string {
  return AVAILABLE_KEYS[Math.floor(Math.random() * AVAILABLE_KEYS.length)];
}

export class ReflexBurstGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'reflex-burst';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const length = sequenceLength(difficulty);
    const beatTempo = tempo(difficulty);
    const fakes = fakeCount(difficulty);
    const totalBeats = length + fakes;

    // Build sequence: real commands first, then sprinkle in fakes
    const commands: BeatCommand[] = [];
    const beatIndices: number[] = Array.from({ length: totalBeats }, (_, i) => i);

    // Shuffle beat indices, pick first `length` for real, rest for fake
    for (let i = beatIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [beatIndices[i], beatIndices[j]] = [beatIndices[j], beatIndices[i]];
    }

    const realBeatIndices = beatIndices.slice(0, length).sort((a, b) => a - b);
    const fakeBeatIndices = beatIndices.slice(length).sort((a, b) => a - b);

    for (const idx of realBeatIndices) {
      commands.push({ key: randomKey(), isFake: false, beatIndex: idx });
    }
    for (const idx of fakeBeatIndices) {
      commands.push({ key: randomKey(), isFake: true, beatIndex: idx });
    }

    // Sort by beatIndex for display order
    commands.sort((a, b) => a.beatIndex - b.beatIndex);

    // Server state tracking
    const pressedBeats = new Set<number>();
    const realBeats = new Set(realBeatIndices);
    const fakeBeats = new Set(fakeBeatIndices);
    const expectedKeys = new Map<number, string>();
    for (const cmd of commands) {
      expectedKeys.set(cmd.beatIndex, cmd.key);
    }

    const timeLimit = TIME_LIMITS[difficulty];

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { totalBeats, tempo: beatTempo, currentBeat: 0 },
      roleData: {
        observer: {
          sequence: commands.map(c => ({
            key: c.key,
            isFake: c.isFake,
            beatIndex: c.beatIndex,
          })),
          tempo: beatTempo,
          totalBeats,
        },
        operator: {
          tempo: beatTempo,
          totalBeats,
          currentBeat: 0,
        },
      },
      timeLimit,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'press') {
          return { correct: false, penalty: 0, feedback: '不明なアクション。' };
        }

        const { key, beatIndex } = action.data as { key: string; beatIndex: number };

        if (typeof key !== 'string' || typeof beatIndex !== 'number') {
          return { correct: false, penalty: 0, feedback: '無効な入力データ。' };
        }

        // Already pressed this beat
        if (pressedBeats.has(beatIndex)) {
          return { correct: false, penalty: 0, feedback: 'このビートは登録済み。' };
        }

        pressedBeats.add(beatIndex);

        // Pressed a fake command — penalty
        if (fakeBeats.has(beatIndex)) {
          return {
            correct: false,
            penalty: 10,
            feedback: 'フェイクコマンドを押した！ システムショック。',
          };
        }

        // Check if this beat is a real command
        if (!realBeats.has(beatIndex)) {
          return {
            correct: false,
            penalty: 5,
            feedback: 'このビートにコマンドはない。',
          };
        }

        // Check key correctness
        const expectedKey = expectedKeys.get(beatIndex);
        if (key.toUpperCase() !== expectedKey) {
          return {
            correct: false,
            penalty: 10,
            feedback: `キーが違う。正解: ${expectedKey}、入力: ${key.toUpperCase()}。`,
          };
        }

        // Correct press
        const allRealPressed = [...realBeats].every(b => pressedBeats.has(b));
        return {
          correct: true,
          penalty: 0,
          feedback: `ビート${beatIndex} -- ${key.toUpperCase()} 確認。`,
          solved: allRealPressed,
        };
      },
    };

    return instance;
  }
}
