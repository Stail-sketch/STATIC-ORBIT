// ===== STATIC ORBIT — Number Crack Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';
import { TIME_LIMITS } from './PuzzleGenerator.js';

function digitCountForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 3;
    case 'normal': return 4;
    case 'hard': return 5;
    case 'extreme': return 6;
  }
}

function generateCode(length: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * 10));
}

function generateHints(code: number[], difficulty: Difficulty): string[] {
  const hints: string[] = [];
  const len = code.length;
  const isEasy = difficulty === 'easy';
  const isHard = difficulty === 'hard' || difficulty === 'extreme';

  // Always give some direct hints
  const directCount = isEasy ? len : isHard ? Math.max(1, Math.floor(len / 3)) : Math.floor(len / 2);
  const indices = Array.from({ length: len }, (_, i) => i);

  // Shuffle indices
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const directIndices = new Set(indices.slice(0, directCount));
  const remainingIndices = indices.slice(directCount);

  // Direct hints: "X桁目はY"
  for (const i of directIndices) {
    hints.push(`${i + 1}桁目は${code[i]}`);
  }

  // Relational hints for remaining digits
  for (const i of remainingIndices) {
    const hintType = Math.floor(Math.random() * 4);
    switch (hintType) {
      case 0: // 偶数/奇数
        hints.push(`${i + 1}桁目は${code[i] % 2 === 0 ? '偶数' : '奇数'}`);
        // Add a range hint too to narrow it down
        if (code[i] <= 4) {
          hints.push(`${i + 1}桁目は5未満`);
        } else {
          hints.push(`${i + 1}桁目は5以上`);
        }
        // Add exact hint disguised as range
        hints.push(`${i + 1}桁目は${code[i]}以上${code[i] + 1}未満`);
        break;
      case 1: { // 合計ヒント with another digit
        const other = indices.find(j => j !== i && !directIndices.has(j));
        if (other != null) {
          hints.push(`${i + 1}桁目と${other + 1}桁目の合計は${code[i] + code[other]}`);
          // Add parity for the other one too
          hints.push(`${other + 1}桁目は${code[other] % 2 === 0 ? '偶数' : '奇数'}`);
          // Ensure solvable: add a range
          hints.push(`${other + 1}桁目は${code[other]}以上${code[other] + 1}未満`);
        } else {
          hints.push(`${i + 1}桁目は${code[i]}`);
        }
        break;
      }
      case 2: { // 大小比較
        const other2 = indices.find(j => j !== i && directIndices.has(j));
        if (other2 != null && code[i] !== code[other2]) {
          hints.push(`${i + 1}桁目は${other2 + 1}桁目より${code[i] > code[other2] ? '大きい' : '小さい'}`);
          // Add range to make solvable
          hints.push(`${i + 1}桁目は${code[i]}以上${code[i] + 1}未満`);
        } else {
          hints.push(`${i + 1}桁目は${code[i]}`);
        }
        break;
      }
      default:
        // Fallback: direct hint
        hints.push(`${i + 1}桁目は${code[i]}`);
    }
  }

  // Shuffle hints
  for (let i = hints.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [hints[i], hints[j]] = [hints[j], hints[i]];
  }

  return hints;
}

export class NumberCrackGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'number-crack';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const digitCount = digitCountForDifficulty(difficulty);
    const code = generateCode(digitCount);
    const codeStr = code.join('');
    const hints = generateHints(code, difficulty);

    const timeLimit = TIME_LIMITS[difficulty];

    const observerData = {
      hints,
      digitCount,
    };

    const operatorData = {
      digitCount,
    };

    // Track last attempted code for scan support
    let lastAttempt: string | null = null;

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { digitCount },
      roleData: {
        observer: observerData,
        operator: operatorData,
        navigator: observerData,
        hacker: observerData,
      },
      timeLimit,

      getHint(hintIndex: number): string {
        if (hintIndex >= digitCount) return 'これ以上のヒントはありません。';
        return `${hintIndex + 1}桁目は${code[hintIndex]}です。`;
      },

      getScanResult(): 'hot' | 'warm' | 'cold' {
        if (!lastAttempt) return 'cold';
        let correct = 0;
        for (let i = 0; i < digitCount; i++) {
          if (lastAttempt[i] === codeStr[i]) correct++;
        }
        const ratio = correct / digitCount;
        if (ratio >= 0.75) return 'hot';
        if (ratio >= 0.25) return 'warm';
        return 'cold';
      },

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'crack') {
          return { correct: false, penalty: 0, feedback: '不明なアクション。' };
        }

        const { code: attempt } = action.data as { code: string };

        if (!attempt || attempt.length !== digitCount) {
          return { correct: false, penalty: 0, feedback: `${digitCount}桁のコードを入力してください。` };
        }

        lastAttempt = attempt;

        if (attempt === codeStr) {
          return { correct: true, penalty: 0, feedback: 'ナンバーロック解除成功！', solved: true };
        }

        // Give partial feedback: how many digits are correct in position
        let correctPositions = 0;
        for (let i = 0; i < digitCount; i++) {
          if (attempt[i] === codeStr[i]) correctPositions++;
        }

        return {
          correct: false,
          penalty: 10,
          feedback: `コード不一致。${correctPositions}/${digitCount}桁が正しい位置にあります。`,
        };
      },
    };

    return instance;
  }
}
