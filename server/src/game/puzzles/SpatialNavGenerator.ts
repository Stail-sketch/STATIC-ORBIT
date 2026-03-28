// ===== STATIC ORBIT — Spatial Nav Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';
import { TIME_LIMITS } from './PuzzleGenerator.js';

type CellType = 'open' | 'wall' | 'start' | 'exit' | 'hazard';

interface Position {
  x: number;
  y: number;
}

function gridSize(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 5;
    case 'normal': return 7;
    case 'hard': return 9;
    case 'extreme': return 11;
  }
}

function hazardCount(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 0;
    case 'normal': return 0;
    case 'hard': return 1;
    case 'extreme': return 3;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Recursive backtracker maze generation */
function generateMaze(width: number, height: number): CellType[][] {
  // Initialize grid: all walls
  const grid: CellType[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 'wall' as CellType),
  );

  // Carve passages using recursive backtracker on odd cells
  const visited = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;

  function carve(x: number, y: number): void {
    visited.add(key(x, y));
    grid[y][x] = 'open';

    const directions = shuffle([
      { dx: 0, dy: -2 },
      { dx: 0, dy: 2 },
      { dx: -2, dy: 0 },
      { dx: 2, dy: 0 },
    ]);

    for (const { dx, dy } of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited.has(key(nx, ny))) {
        // Carve the wall between current and next
        grid[y + dy / 2][x + dx / 2] = 'open';
        carve(nx, ny);
      }
    }
  }

  // Start from (1, 1)
  carve(1, 1);

  return grid;
}

export class SpatialNavGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'spatial-nav';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const size = gridSize(difficulty);
    const grid = generateMaze(size, size);

    // Place start at top-left open area, exit at bottom-right open area
    const startPos: Position = { x: 1, y: 1 };
    const exitPos: Position = { x: size - 2, y: size - 2 };

    grid[startPos.y][startPos.x] = 'start';
    grid[exitPos.y][exitPos.x] = 'exit';

    // Add hazards on open cells (hard+ only)
    const numHazards = hazardCount(difficulty);
    const hazards: Position[] = [];

    if (numHazards > 0) {
      const openCells: Position[] = [];
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (grid[y][x] === 'open') {
            // Don't place hazards adjacent to start or exit
            const distToStart = Math.abs(x - startPos.x) + Math.abs(y - startPos.y);
            const distToExit = Math.abs(x - exitPos.x) + Math.abs(y - exitPos.y);
            if (distToStart > 2 && distToExit > 2) {
              openCells.push({ x, y });
            }
          }
        }
      }

      const shuffled = shuffle(openCells);
      for (let i = 0; i < Math.min(numHazards, shuffled.length); i++) {
        const pos = shuffled[i];
        grid[pos.y][pos.x] = 'hazard';
        hazards.push(pos);
      }
    }

    // Server-side state
    const currentPos: Position = { ...startPos };
    const timeLimit = TIME_LIMITS[difficulty];

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { mapSize: size, currentPos: { ...currentPos } },
      roleData: {
        observer: {
          fullMap: grid.map(row => [...row]),
          startPos: { ...startPos },
          exitPos: { ...exitPos },
          hazards: hazards.map(h => ({ ...h })),
          mapSize: size,
        },
        operator: {
          visibleRadius: 2,
          currentPos: { ...startPos },
          mapSize: size,
        },
      },
      timeLimit,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'move') {
          return { correct: false, penalty: 0, feedback: '不明なアクション。' };
        }

        const { direction } = action.data as { direction: string };
        if (!direction || !['up', 'down', 'left', 'right'].includes(direction)) {
          return { correct: false, penalty: 0, feedback: '無効な方向。' };
        }

        const delta: Record<string, Position> = {
          up: { x: 0, y: -1 },
          down: { x: 0, y: 1 },
          left: { x: -1, y: 0 },
          right: { x: 1, y: 0 },
        };

        const d = delta[direction];
        const nx = currentPos.x + d.x;
        const ny = currentPos.y + d.y;

        // Out of bounds check
        if (nx < 0 || nx >= size || ny < 0 || ny >= size) {
          return { correct: false, penalty: 0, feedback: '範囲外には移動できない。' };
        }

        // Wall check
        if (grid[ny][nx] === 'wall') {
          return { correct: false, penalty: 0, feedback: '壁が道を塞いでいる。' };
        }

        // Move to new position
        currentPos.x = nx;
        currentPos.y = ny;

        // Update shared data so server tracks position
        (instance.sharedData as Record<string, unknown>).currentPos = { ...currentPos };

        // Hazard check
        if (grid[ny][nx] === 'hazard') {
          return {
            correct: false,
            penalty: 10,
            feedback: '危険地帯！ 環境ダメージを受けた。',
          };
        }

        // Exit check
        if (grid[ny][nx] === 'exit') {
          return {
            correct: true,
            penalty: 0,
            feedback: '出口到達。ナビゲーション完了。',
            solved: true,
          };
        }

        const dirNames: Record<string, string> = { up: '上', down: '下', left: '左', right: '右' };
        return {
          correct: true,
          penalty: 0,
          feedback: `${dirNames[direction]}に移動。位置: (${nx}, ${ny})`,
        };
      },
    };

    return instance;
  }
}
