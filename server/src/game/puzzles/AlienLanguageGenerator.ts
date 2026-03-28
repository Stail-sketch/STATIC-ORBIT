// ===== STATIC ORBIT — Alien Language Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';
import { TIME_LIMITS } from './PuzzleGenerator.js';

const ALIEN_CHARS = ['◈', '◉', '◊', '⬡', '⬢', '⬣', '☍', '☊', '☋', '☌', '⟁', '⟐'];

const HIRAGANA_POOL = [
  'あ', 'い', 'う', 'え', 'お',
  'か', 'き', 'く', 'け', 'こ',
  'さ', 'し', 'す', 'せ', 'そ',
  'た', 'ち', 'つ', 'て', 'と',
  'な', 'に', 'ぬ', 'ね', 'の',
  'は', 'ひ', 'ふ', 'へ', 'ほ',
  'ま', 'み', 'む', 'め', 'も',
  'や', 'ゆ', 'よ',
  'ら', 'り', 'る', 'れ', 'ろ',
  'わ', 'を', 'ん',
];

function tableSizeForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 8;
    case 'normal': return 10;
    case 'hard': return 11;
    case 'extreme': return 12;
  }
}

function phraseLengthForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 3;
    case 'normal': return 5;
    case 'hard': return 7;
    case 'extreme': return 8;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export class AlienLanguageGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'alien-language';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const tableSize = tableSizeForDifficulty(difficulty);
    const phraseLen = phraseLengthForDifficulty(difficulty);

    // Build translation table
    const selectedAlien = shuffle(ALIEN_CHARS).slice(0, tableSize);
    const selectedHiragana = shuffle(HIRAGANA_POOL).slice(0, tableSize);

    const translationTable: Record<string, string> = {};
    for (let i = 0; i < tableSize; i++) {
      translationTable[selectedAlien[i]] = selectedHiragana[i];
    }

    // Generate alien phrase using characters from the table
    const alienPhrase: string[] = Array.from({ length: phraseLen }, () =>
      selectedAlien[Math.floor(Math.random() * tableSize)]
    );

    const alienText = alienPhrase.join('');
    const correctTranslation = alienPhrase.map(c => translationTable[c]).join('');

    const timeLimit = TIME_LIMITS[difficulty];

    const observerData = {
      translationTable,
      alienText,
      phraseLength: phraseLen,
    };

    const operatorData = {
      alienText,
      phraseLength: phraseLen,
    };

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { phraseLength: phraseLen },
      roleData: {
        observer: observerData,
        operator: operatorData,
        navigator: observerData,
        hacker: observerData,
      },
      timeLimit,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'translate') {
          return { correct: false, penalty: 0, feedback: '不明なアクション。' };
        }

        const { translation } = action.data as { translation: string };

        if (!translation) {
          return { correct: false, penalty: 0, feedback: '翻訳テキストを入力してください。' };
        }

        if (translation === correctTranslation) {
          return { correct: true, penalty: 0, feedback: '異星語翻訳成功！メッセージ解読完了。', solved: true };
        }

        // Partial feedback
        let correctChars = 0;
        const minLen = Math.min(translation.length, correctTranslation.length);
        for (let i = 0; i < minLen; i++) {
          if (translation[i] === correctTranslation[i]) correctChars++;
        }

        return {
          correct: false,
          penalty: 10,
          feedback: `翻訳不一致。${correctChars}/${phraseLen}文字が正しい位置にあります。`,
        };
      },
    };

    return instance;
  }
}
