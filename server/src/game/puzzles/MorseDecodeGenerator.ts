// ===== STATIC ORBIT — Morse Decode Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';
import { TIME_LIMITS } from './PuzzleGenerator.js';

const MORSE_MAP: Record<string, string> = {
  A: '.-',    B: '-...',  C: '-.-.',  D: '-..',   E: '.',
  F: '..-.',  G: '--.',   H: '....',  I: '..',    J: '.---',
  K: '-.-',   L: '.-..',  M: '--',    N: '-.',    O: '---',
  P: '.--.',  Q: '--.-',  R: '.-.',   S: '...',   T: '-',
  U: '..-',   V: '...-',  W: '.--',   X: '-..-',  Y: '-.--',
  Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
};

const WORD_POOLS: Record<'easy' | 'normal' | 'hard' | 'extreme', string[]> = {
  easy: ['GO', 'OK', 'HI', 'NO', 'UP', 'SOS', 'YES'],
  normal: ['HELP', 'SEND', 'STOP', 'CODE', 'DATA', 'OPEN', 'SAFE'],
  hard: ['ORBIT', 'GHOST', 'RELAY', 'ABORT', 'ALPHA'],
  extreme: ['STATIC', 'CIPHER', 'BREACH', 'ESCAPE'],
};

function toMorseCode(word: string): string {
  return word
    .toUpperCase()
    .split('')
    .map(ch => MORSE_MAP[ch] ?? '?')
    .join(' ');
}

function playbackSpeedForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 10;
    case 'normal': return 15;
    case 'hard': return 20;
    case 'extreme': return 25;
  }
}

function buildReferenceChart(): Record<string, string> {
  return { ...MORSE_MAP };
}

export class MorseDecodeGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'morse-decode';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const pool = WORD_POOLS[difficulty];
    const targetWord = pool[Math.floor(Math.random() * pool.length)];

    const morseSequence = toMorseCode(targetWord);
    const playbackSpeed = playbackSpeedForDifficulty(difficulty);
    const referenceChart = buildReferenceChart();

    // On easy/normal, observer also sees decoded letters next to morse groups
    const showLetters = difficulty === 'easy' || difficulty === 'normal';

    // Build morse groups with decoded letters for observer
    const morseGroups = targetWord.split('').map(ch => ({
      letter: ch,
      morse: MORSE_MAP[ch] ?? '?',
    }));

    const timeLimit = TIME_LIMITS[difficulty];

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { targetLength: targetWord.length },
      roleData: {
        observer: {
          morseSequence,
          playbackSpeed,
          targetWord,
          showLetters,
          morseGroups,
        },
        operator: {
          referenceChart,
          targetLength: targetWord.length,
        },
      },
      timeLimit,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'decode') {
          return { correct: false, penalty: 0, feedback: '不明なアクション。' };
        }

        const { answer } = action.data as { answer: string };

        if (!answer) {
          return { correct: false, penalty: 0, feedback: '回答が未入力。' };
        }

        if (answer.toUpperCase() === targetWord.toUpperCase()) {
          return {
            correct: true,
            penalty: 0,
            feedback: `解読完了: "${targetWord}"。信号確認。`,
            solved: true,
          };
        }

        return {
          correct: false,
          penalty: 15,
          feedback: `解読失敗。${targetWord.length}文字が必要。`,
        };
      },
    };

    return instance;
  }
}
