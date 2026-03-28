// ===== STATIC ORBIT — Emotion Code Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';
import { TIME_LIMITS } from './PuzzleGenerator.js';

interface EmotionDef {
  emotion: string;
  color: string;
  symbol: string;
}

const EMOTIONS: EmotionDef[] = [
  { emotion: '怒り', color: 'red', symbol: '♠' },
  { emotion: '恐怖', color: 'purple', symbol: '♥' },
  { emotion: '喜び', color: 'yellow', symbol: '♦' },
  { emotion: '悲しみ', color: 'blue', symbol: '♣' },
  { emotion: '驚き', color: 'orange', symbol: '★' },
  { emotion: '嫌悪', color: 'green', symbol: '☆' },
  { emotion: '平穏', color: 'cyan', symbol: '△' },
  { emotion: '興奮', color: 'magenta', symbol: '○' },
];

function sequenceLengthForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 4;
    case 'normal': return 4;
    case 'hard': return 5;
    case 'extreme': return 6;
  }
}

export class EmotionCodeGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'emotion-code';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const seqLength = sequenceLengthForDifficulty(difficulty);

    // Pick random emotions for the sequence (can repeat)
    const sequence: EmotionDef[] = Array.from({ length: seqLength }, () =>
      EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)]
    );

    const timeLimit = TIME_LIMITS[difficulty];

    const observerData = {
      sequence: sequence.map(e => ({
        emotion: e.emotion,
        color: e.color,
        symbol: e.symbol,
      })),
      sequenceLength: seqLength,
      difficulty,
    };

    const operatorData = {
      availableEmotions: EMOTIONS.map(e => e.emotion),
      availableColors: EMOTIONS.map(e => e.color),
      availableSymbols: EMOTIONS.map(e => e.symbol),
      sequenceLength: seqLength,
      difficulty,
    };

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { sequenceLength: seqLength },
      roleData: {
        observer: observerData,
        operator: operatorData,
        navigator: observerData,
        hacker: observerData,
      },
      timeLimit,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'submit-emotions') {
          return { correct: false, penalty: 0, feedback: '不明なアクション。' };
        }

        const { sequence: submitted } = action.data as {
          sequence: Array<{ emotion: string; color: string; symbol: string }>;
        };

        if (!submitted || submitted.length !== seqLength) {
          return { correct: false, penalty: 0, feedback: `${seqLength}個の感情を入力してください。` };
        }

        // For extreme difficulty, expected order is reversed
        const expectedSequence = difficulty === 'extreme' ? [...sequence].reverse() : sequence;

        let allCorrect = true;
        const errors: string[] = [];

        for (let i = 0; i < seqLength; i++) {
          const expected = expectedSequence[i];
          const sub = submitted[i];

          // Check based on difficulty
          if (sub.emotion !== expected.emotion) {
            allCorrect = false;
            errors.push(`${i + 1}番目: 感情が不一致`);
            continue;
          }

          if (difficulty === 'normal' || difficulty === 'hard' || difficulty === 'extreme') {
            if (sub.color !== expected.color) {
              allCorrect = false;
              errors.push(`${i + 1}番目: 色が不一致`);
              continue;
            }
          }

          if (difficulty === 'hard' || difficulty === 'extreme') {
            if (sub.symbol !== expected.symbol) {
              allCorrect = false;
              errors.push(`${i + 1}番目: シンボルが不一致`);
              continue;
            }
          }
        }

        if (allCorrect) {
          return { correct: true, penalty: 0, feedback: '感情コード解読成功！', solved: true };
        }

        return {
          correct: false,
          penalty: 10,
          feedback: `感情コード不一致: ${errors.slice(0, 3).join('、')}${errors.length > 3 ? '...' : ''}`,
        };
      },
    };

    return instance;
  }
}
