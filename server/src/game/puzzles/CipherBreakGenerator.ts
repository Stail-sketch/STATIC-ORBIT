// ===== STATIC ORBIT — Cipher Break Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';
import { TIME_LIMITS } from './PuzzleGenerator.js';

const SYMBOLS = ['◆', '◇', '●', '○', '▲', '△', '■', '□', '★', '☆'] as const;

const WORD_POOL_SHORT = [
  'CORE', 'LINK', 'NODE', 'HACK', 'DATA', 'PORT', 'FLUX', 'GRID', 'VOLT', 'BEAM',
  'LOCK', 'GATE', 'WIRE', 'SCAN', 'CODE', 'SYNC', 'BYTE', 'MESH', 'DISK', 'FUSE',
];

const WORD_POOL_MEDIUM = [
  'ORBIT', 'GHOST', 'NEXUS', 'PROXY', 'SURGE', 'RADAR', 'FIBER', 'INDEX', 'PULSE', 'ROGUE',
  'PHASE', 'RELAY', 'DRIVE', 'TRACE', 'BLAZE', 'PRISM', 'STACK', 'VAULT', 'CRYPT', 'SHARD',
];

const WORD_POOL_LONG = [
  'STATIC', 'CIPHER', 'MATRIX', 'SIGNAL', 'BREACH', 'UPLINK', 'VECTOR', 'BINARY',
  'REBOOT', 'DECODE', 'SHADOW', 'CARBON', 'PHOTON', 'SECTOR', 'PLASMA', 'ANCHOR',
];

const PHRASE_POOL = [
  'CORE BREACH', 'GHOST NODE', 'DATA FLUX', 'GRID SYNC', 'VOID LOCK',
  'DARK PULSE', 'ROGUE LINK', 'DEAD ORBIT', 'LOST TRACE', 'NEON GATE',
];

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getTargetForDifficulty(difficulty: Difficulty): string {
  switch (difficulty) {
    case 'easy': return pickRandom(WORD_POOL_SHORT);
    case 'normal': return pickRandom(WORD_POOL_MEDIUM);
    case 'hard': return pickRandom(WORD_POOL_LONG);
    case 'extreme': return pickRandom(PHRASE_POOL);
  }
}

function dummySymbolCount(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 0;
    case 'normal': return 1;
    case 'hard': return 2;
    case 'extreme': return 3;
  }
}

export class CipherBreakGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'cipher-break';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const target = getTargetForDifficulty(difficulty);

    // Collect unique letters in the target (excluding space)
    const uniqueLetters = [...new Set(target.replace(/ /g, '').split(''))];

    // Assign symbols to letters
    const shuffledSymbols = shuffle([...SYMBOLS]);
    const cipherMap: Record<string, string> = {}; // symbol → letter
    const encryptMap: Record<string, string> = {}; // letter → symbol

    uniqueLetters.forEach((letter, i) => {
      const symbol = shuffledSymbols[i];
      cipherMap[symbol] = letter;
      encryptMap[letter] = symbol;
    });

    // Add dummy symbols to the cipher table
    const dummyCount = dummySymbolCount(difficulty);
    const dummyLetters = 'XZQJW'.split('').filter(l => !uniqueLetters.includes(l));
    for (let i = 0; i < dummyCount && i < dummyLetters.length; i++) {
      const dummySymbol = shuffledSymbols[uniqueLetters.length + i];
      if (dummySymbol) {
        cipherMap[dummySymbol] = dummyLetters[i];
      }
    }

    // Encrypt the target
    const encryptedSequence = target.split('').map(ch => {
      if (ch === ' ') return ' ';
      return encryptMap[ch] ?? ch;
    });

    // Build shuffled cipher table entries for the observer
    const cipherTable = shuffle(
      Object.entries(cipherMap).map(([symbol, letter]) => ({ symbol, letter }))
    );

    const timeLimit = TIME_LIMITS[difficulty];

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { symbolCount: uniqueLetters.length + dummyCount },
      roleData: {
        observer: {
          cipherTable,
        },
        operator: {
          encryptedSequence,
          targetLength: target.replace(/ /g, '').length,
          hasSpaces: target.includes(' '),
        },
      },
      timeLimit,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'submit-decode') {
          return { correct: false, penalty: 0, feedback: '不明なアクション。' };
        }

        const { decoded } = action.data as { decoded: string };
        if (!decoded) {
          return { correct: false, penalty: 0, feedback: '解読テキストが未入力。' };
        }

        const normalized = decoded.toUpperCase().trim();
        if (normalized === target) {
          return {
            correct: true,
            penalty: 0,
            feedback: '暗号解読成功。',
            solved: true,
          };
        }

        return {
          correct: false,
          penalty: 15,
          feedback: '解読失敗。もう一度試せ。',
        };
      },
    };

    return instance;
  }
}
