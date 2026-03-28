// ===== STATIC ORBIT — Keycard Forge Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';
import { TIME_LIMITS } from './PuzzleGenerator.js';

const JAPANESE_NAMES = [
  '田中太郎', '佐藤花子', '鈴木一郎', '高橋美咲', '伊藤健太',
  '渡辺由紀', '山本翔太', '中村真理', '小林大輔', '加藤恵',
  '吉田隆', '山田智子', '松本修', '井上桜', '木村拓也',
];

const DEPARTMENTS = ['SEC', 'ENG', 'MED', 'OPS', 'COM', 'NAV', 'SCI', 'ADM'];
const BLOOD_TYPES = ['A', 'B', 'O', 'AB'];
const CLEARANCES = ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'OMEGA'];

interface FieldDef {
  name: string;
  generator: () => string;
}

const ALL_FIELDS: FieldDef[] = [
  { name: '名前', generator: () => JAPANESE_NAMES[Math.floor(Math.random() * JAPANESE_NAMES.length)] },
  { name: '部署コード', generator: () => {
    const dept = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];
    const num = String(Math.floor(Math.random() * 900) + 100);
    return `${dept}-${num}`;
  }},
  { name: 'アクセスレベル', generator: () => String(Math.floor(Math.random() * 9) + 1) },
  { name: '血液型', generator: () => BLOOD_TYPES[Math.floor(Math.random() * BLOOD_TYPES.length)] },
  { name: '社員番号', generator: () => {
    const prefix = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const num = String(Math.floor(Math.random() * 90000) + 10000);
    return `${prefix}-${num}`;
  }},
  { name: 'セキュリティクリアランス', generator: () => CLEARANCES[Math.floor(Math.random() * CLEARANCES.length)] },
];

function fieldCountForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 3;
    case 'normal': return 4;
    case 'hard': return 5;
    case 'extreme': return 6;
  }
}

export class KeycardForgeGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'keycard-forge';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const fieldCount = fieldCountForDifficulty(difficulty);

    // Shuffle and pick fields
    const shuffled = [...ALL_FIELDS];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selectedFields = shuffled.slice(0, fieldCount);

    // Generate values
    const fieldValues: Record<string, string> = {};
    for (const field of selectedFields) {
      fieldValues[field.name] = field.generator();
    }

    const fieldNames = selectedFields.map(f => f.name);
    const timeLimit = TIME_LIMITS[difficulty];

    const observerData = {
      fields: fieldValues,
      fieldNames,
    };

    const operatorData = {
      fieldNames,
    };

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { fieldCount },
      roleData: {
        observer: observerData,
        operator: operatorData,
        navigator: observerData,
        hacker: observerData,
      },
      timeLimit,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'forge') {
          return { correct: false, penalty: 0, feedback: '不明なアクション。' };
        }

        const { fields } = action.data as { fields: Record<string, string> };

        if (!fields) {
          return { correct: false, penalty: 0, feedback: 'フィールドデータが不足しています。' };
        }

        let correctCount = 0;
        const errors: string[] = [];

        for (const name of fieldNames) {
          const expected = fieldValues[name];
          const submitted = fields[name];

          if (!submitted) {
            errors.push(`${name}が未入力`);
            continue;
          }

          // Case-insensitive comparison for names
          const match = name === '名前'
            ? submitted.trim().toLowerCase() === expected.toLowerCase()
            : submitted.trim() === expected;

          if (match) {
            correctCount++;
          } else {
            errors.push(`${name}が不一致`);
          }
        }

        if (correctCount === fieldCount) {
          return { correct: true, penalty: 0, feedback: 'IDカード偽造成功！認証通過。', solved: true };
        }

        return {
          correct: false,
          penalty: 10,
          feedback: `偽造失敗: ${errors.join('、')}。(${correctCount}/${fieldCount}一致)`,
        };
      },
    };

    return instance;
  }
}
