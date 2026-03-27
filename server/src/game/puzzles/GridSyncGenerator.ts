// ===== STATIC ORBIT — Grid Sync Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';
import { TIME_LIMITS } from './PuzzleGenerator.js';

function gridSizeForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 5;
    case 'normal': return 6;
    case 'hard': return 7;
    case 'extreme': return 7;
  }
}

function generatePattern(size: number): boolean[][] {
  const grid: boolean[][] = [];
  for (let row = 0; row < size; row++) {
    grid.push([]);
    for (let col = 0; col < size; col++) {
      // 30-50% fill rate — aim for ~40%
      grid[row].push(Math.random() < 0.4);
    }
  }
  return grid;
}

export class GridSyncGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'grid-sync';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const size = gridSizeForDifficulty(difficulty);
    const targetPattern = generatePattern(size);

    const timeLimit = TIME_LIMITS[difficulty];

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { gridSize: size },
      roleData: {
        observer: {
          targetPattern,
        },
        operator: {
          gridSize: size,
        },
      },
      timeLimit,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'submit-grid') {
          return { correct: false, penalty: 0, feedback: 'Unknown action.' };
        }

        const { grid } = action.data as { grid: boolean[][] };
        if (!grid || !Array.isArray(grid)) {
          return { correct: false, penalty: 0, feedback: 'Invalid grid data.' };
        }

        if (grid.length !== size) {
          return { correct: false, penalty: 15, feedback: 'Grid dimensions mismatch.' };
        }

        // Check each cell
        let mismatches = 0;
        for (let row = 0; row < size; row++) {
          if (!grid[row] || grid[row].length !== size) {
            return { correct: false, penalty: 15, feedback: 'Grid dimensions mismatch.' };
          }
          for (let col = 0; col < size; col++) {
            if (!!grid[row][col] !== targetPattern[row][col]) {
              mismatches++;
            }
          }
        }

        if (mismatches === 0) {
          return {
            correct: true,
            penalty: 0,
            feedback: 'Grid pattern synchronized perfectly.',
            solved: true,
          };
        }

        return {
          correct: false,
          penalty: 15,
          feedback: `Pattern mismatch: ${mismatches} cell${mismatches > 1 ? 's' : ''} differ.`,
        };
      },
    };

    return instance;
  }
}
