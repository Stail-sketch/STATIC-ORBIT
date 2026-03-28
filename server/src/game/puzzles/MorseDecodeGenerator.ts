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

const WORD_POOLS: Record<'easy' | 'normal' | 'hard', string[]> = {
  easy: [
    'FIRE', 'LOCK', 'OPEN', 'CODE', 'VENT', 'CORE', 'WIRE', 'GRID',
    'HACK', 'SYNC', 'FLUX', 'BEAM', 'BOLT', 'LINK', 'NODE', 'SCAN',
  ],
  normal: [
    'ORBIT', 'GHOST', 'RELAY', 'POWER', 'DRIVE', 'CRYPT', 'GUARD',
    'BREACH', 'CIPHER', 'STATIC', 'SIGNAL', 'BYPASS', 'MATRIX',
    'SHIELD', 'ACCESS', 'UPLINK',
  ],
  hard: [
    'REACTOR', 'DECRYPT', 'ORBITAL', 'FIREWALL', 'OVERRIDE',
    'TERMINAL', 'PROTOCOL', 'SHUTDOWN', 'SPECTRUM', 'FIRMWARE',
    'AIRLOCK', 'NETWORK', 'COMMAND', 'DEFENSE',
  ],
};

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function randomAlphanumeric(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

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

function buildReferenceChart(difficulty: Difficulty): Record<string, string> {
  const chart: Record<string, string> = { ...MORSE_MAP };

  if (difficulty === 'hard' || difficulty === 'extreme') {
    const keys = Object.keys(chart);
    const blanked = shuffle(keys);
    const blankedCount = difficulty === 'hard' ? 6 : 12;
    for (let i = 0; i < blankedCount && i < blanked.length; i++) {
      chart[blanked[i]] = '???';
    }
  }

  return chart;
}

export class MorseDecodeGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'morse-decode';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    let targetWord: string;

    if (difficulty === 'extreme') {
      const length = Math.floor(Math.random() * 3) + 6; // 6-8
      targetWord = randomAlphanumeric(length);
    } else {
      const pool = WORD_POOLS[difficulty === 'hard' ? 'hard' : difficulty === 'normal' ? 'normal' : 'easy'];
      targetWord = pool[Math.floor(Math.random() * pool.length)];
    }

    const morseSequence = toMorseCode(targetWord);
    const playbackSpeed = playbackSpeedForDifficulty(difficulty);
    const referenceChart = buildReferenceChart(difficulty);

    const timeLimit = TIME_LIMITS[difficulty];

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { targetLength: targetWord.length },
      roleData: {
        observer: {
          morseSequence,
          playbackSpeed,
          targetWord, // observer can see the actual word too for reference
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
