// ===== STATIC ORBIT — Pipe Flow Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';
import { TIME_LIMITS } from './PuzzleGenerator.js';

type PipeType = 'straight' | 'corner' | 'tee' | 'cross' | 'empty';
type Rotation = 0 | 90 | 180 | 270;

interface PipeCell {
  pipeType: PipeType;
  rotation: Rotation;
}

function gridSizeForDifficulty(difficulty: Difficulty): { rows: number; cols: number } {
  switch (difficulty) {
    case 'easy': return { rows: 4, cols: 4 };
    case 'normal': return { rows: 5, cols: 5 };
    case 'hard': return { rows: 5, cols: 6 };
    case 'extreme': return { rows: 6, cols: 6 };
  }
}

const ROTATIONS: Rotation[] = [0, 90, 180, 270];

function randomRotation(): Rotation {
  return ROTATIONS[Math.floor(Math.random() * 4)];
}

/**
 * Generate a valid pipe grid with a path from left to right.
 * Simple approach: carve a path, then fill remaining cells.
 */
function generateGrid(rows: number, cols: number): PipeCell[][] {
  const grid: PipeCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ pipeType: 'empty' as PipeType, rotation: 0 as Rotation }))
  );

  // Carve a path from (startRow, 0) to (endRow, cols-1)
  const startRow = Math.floor(Math.random() * rows);
  let currentRow = startRow;

  for (let col = 0; col < cols; col++) {
    const isFirst = col === 0;
    const isLast = col === cols - 1;

    // Decide if we go straight or move up/down
    let nextRow = currentRow;
    if (!isLast && Math.random() < 0.4) {
      const direction = Math.random() < 0.5 ? -1 : 1;
      const candidate = currentRow + direction;
      if (candidate >= 0 && candidate < rows) {
        nextRow = candidate;
      }
    }

    if (nextRow !== currentRow && !isLast) {
      // Place a corner at current position going horizontal -> vertical
      grid[currentRow][col] = { pipeType: 'corner', rotation: nextRow > currentRow ? 0 : 90 as Rotation };

      // Fill vertical segment
      const minR = Math.min(currentRow, nextRow);
      const maxR = Math.max(currentRow, nextRow);
      for (let r = minR + 1; r < maxR; r++) {
        grid[r][col] = { pipeType: 'straight', rotation: 90 };
      }

      // Place a corner at next position going vertical -> horizontal
      grid[nextRow][col] = {
        pipeType: 'corner',
        rotation: (nextRow > currentRow ? 270 : 180) as Rotation,
      };

      // If first col had a corner, ensure left connection
      if (isFirst) {
        grid[currentRow][col] = { pipeType: 'corner', rotation: (nextRow > currentRow ? 0 : 270) as Rotation };
      }

      currentRow = nextRow;
    } else {
      // Straight pipe
      grid[currentRow][col] = { pipeType: 'straight', rotation: 0 };
    }
  }

  // Fill empty cells with random pipes (decorative)
  const PIPE_TYPES: PipeType[] = ['straight', 'corner', 'tee', 'cross'];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].pipeType === 'empty') {
        if (Math.random() < 0.6) {
          grid[r][c] = {
            pipeType: PIPE_TYPES[Math.floor(Math.random() * PIPE_TYPES.length)],
            rotation: randomRotation(),
          };
        }
      }
    }
  }

  return grid;
}

function scrambleRotations(grid: PipeCell[][]): number[][] {
  return grid.map(row =>
    row.map(cell => {
      if (cell.pipeType === 'empty' || cell.pipeType === 'cross') return cell.rotation;
      return randomRotation();
    })
  );
}

export class PipeFlowGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'pipe-flow';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const { rows, cols } = gridSizeForDifficulty(difficulty);
    const solutionGrid = generateGrid(rows, cols);
    const solutionRotations = solutionGrid.map(row => row.map(cell => cell.rotation));
    const scrambledRotations = scrambleRotations(solutionGrid);

    const gridTypes = solutionGrid.map(row => row.map(cell => cell.pipeType));

    const timeLimit = TIME_LIMITS[difficulty];

    const observerData = {
      grid: solutionGrid.map(row => row.map(cell => ({
        pipeType: cell.pipeType,
        rotation: cell.rotation,
      }))),
      rows,
      cols,
    };

    const operatorData = {
      grid: solutionGrid.map((row, r) => row.map((cell, c) => ({
        pipeType: cell.pipeType,
        rotation: scrambledRotations[r][c],
      }))),
      rows,
      cols,
    };

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { rows, cols },
      roleData: {
        observer: observerData,
        operator: operatorData,
        navigator: observerData,
        hacker: observerData,
      },
      timeLimit,

      validate(action: GameAction): ValidationResult {
        if (action.action === 'rotate') {
          const { row, col } = action.data as { row: number; col: number };
          if (row == null || col == null || row < 0 || row >= rows || col < 0 || col >= cols) {
            return { correct: false, penalty: 0, feedback: '無効な座標。' };
          }
          // Client-side rotation tracking; no penalty for rotating
          return { correct: true, penalty: 0, feedback: `パイプ(${row + 1},${col + 1})を回転。` };
        }

        if (action.action === 'submit-pipes') {
          const { grid } = action.data as { grid: number[][] };
          if (!grid || grid.length !== rows) {
            return { correct: false, penalty: 0, feedback: 'グリッドデータが無効です。' };
          }

          let allCorrect = true;
          for (let r = 0; r < rows; r++) {
            if (!grid[r] || grid[r].length !== cols) {
              return { correct: false, penalty: 0, feedback: 'グリッドデータが無効です。' };
            }
            for (let c = 0; c < cols; c++) {
              if (gridTypes[r][c] === 'empty' || gridTypes[r][c] === 'cross') continue;
              if (grid[r][c] !== solutionRotations[r][c]) {
                allCorrect = false;
                break;
              }
            }
            if (!allCorrect) break;
          }

          if (allCorrect) {
            return { correct: true, penalty: 0, feedback: 'パイプ接続完了！流体が流れています。', solved: true };
          }

          return { correct: false, penalty: 15, feedback: 'パイプの接続が正しくありません。再調整してください。' };
        }

        return { correct: false, penalty: 0, feedback: '不明なアクション。' };
      },
    };

    return instance;
  }
}
