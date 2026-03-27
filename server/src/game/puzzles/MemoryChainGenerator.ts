// ===== STATIC ORBIT — Memory Chain Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';
import { TIME_LIMITS } from './PuzzleGenerator.js';

interface GridConfig {
  cols: number;
  rows: number;
}

function gridForDifficulty(difficulty: Difficulty): GridConfig {
  switch (difficulty) {
    case 'easy': return { cols: 3, rows: 3 };
    case 'normal': return { cols: 4, rows: 3 };
    case 'hard': return { cols: 4, rows: 4 };
    case 'extreme': return { cols: 5, rows: 4 };
  }
}

function sequenceLengthForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 4;
    case 'normal': return 6;
    case 'hard': return 8;
    case 'extreme': return 10;
  }
}

function displayTimeForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 1000;
    case 'normal': return 750;
    case 'hard': return 500;
    case 'extreme': return 350;
  }
}

function generatePanelLabels(cols: number, rows: number): string[] {
  const labels: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Label format: A1, A2, ... B1, B2, etc.
      const rowChar = String.fromCharCode(65 + r); // A, B, C, D, E
      labels.push(`${rowChar}${c + 1}`);
    }
  }
  return labels;
}

export class MemoryChainGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'memory-chain';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const grid = gridForDifficulty(difficulty);
    const seqLength = sequenceLengthForDifficulty(difficulty);
    const displayTime = displayTimeForDifficulty(difficulty);

    const labels = generatePanelLabels(grid.cols, grid.rows);
    const totalPanels = labels.length;

    // Generate random sequence of panel labels
    const sequence: string[] = [];
    for (let i = 0; i < seqLength; i++) {
      sequence.push(labels[Math.floor(Math.random() * totalPanels)]);
    }

    const timeLimit = TIME_LIMITS[difficulty];

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { gridCols: grid.cols, gridRows: grid.rows },
      roleData: {
        observer: {
          panels: labels,
          sequence,
          displayTime,
          gridCols: grid.cols,
          gridRows: grid.rows,
        },
        operator: {
          panels: labels,
          sequenceLength: seqLength,
          gridCols: grid.cols,
          gridRows: grid.rows,
        },
      },
      timeLimit,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'submit-sequence') {
          return { correct: false, penalty: 0, feedback: 'Unknown action.' };
        }

        const { sequence: submitted } = action.data as { sequence: string[] };

        if (!submitted || !Array.isArray(submitted)) {
          return { correct: false, penalty: 0, feedback: 'No sequence provided.' };
        }

        if (submitted.length !== sequence.length) {
          return {
            correct: false,
            penalty: 15,
            feedback: `Expected ${sequence.length} steps, got ${submitted.length}.`,
          };
        }

        // Check exact sequence match
        for (let i = 0; i < sequence.length; i++) {
          if (submitted[i] !== sequence[i]) {
            return {
              correct: false,
              penalty: 15,
              feedback: `Sequence mismatch at step ${i + 1}.`,
            };
          }
        }

        return {
          correct: true,
          penalty: 0,
          feedback: 'Sequence verified. Access granted.',
          solved: true,
        };
      },
    };

    return instance;
  }
}
