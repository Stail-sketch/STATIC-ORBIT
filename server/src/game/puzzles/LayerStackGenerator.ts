// ===== STATIC ORBIT — Layer Stack Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';
import { TIME_LIMITS } from './PuzzleGenerator.js';

function layerCountForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 3;
    case 'normal': return 3;
    case 'hard': return 4;
    case 'extreme': return 4;
  }
}

/** Generate a 5x5 layer pattern with some cells filled */
function generateLayer(): boolean[][] {
  const grid: boolean[][] = Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => false)
  );

  // Fill 3-7 random cells
  const cellCount = Math.floor(Math.random() * 5) + 3;
  let filled = 0;
  while (filled < cellCount) {
    const r = Math.floor(Math.random() * 5);
    const c = Math.floor(Math.random() * 5);
    if (!grid[r][c]) {
      grid[r][c] = true;
      filled++;
    }
  }
  return grid;
}

/** Combine layers into a single 5x5 pattern (OR operation) */
function combineLayers(layers: boolean[][][]): boolean[][] {
  const combined: boolean[][] = Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => false)
  );
  for (const layer of layers) {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (layer[r][c]) combined[r][c] = true;
      }
    }
  }
  return combined;
}

export class LayerStackGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'layer-stack';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const layerCount = layerCountForDifficulty(difficulty);

    // Generate layers; the correct order is 0, 1, 2, ...
    const correctOrder = Array.from({ length: layerCount }, (_, i) => i);
    const layers = correctOrder.map(() => generateLayer());
    const combined = combineLayers(layers);

    // Shuffled order for the operator
    const shuffledOrder = [...correctOrder];
    for (let i = shuffledOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOrder[i], shuffledOrder[j]] = [shuffledOrder[j], shuffledOrder[i]];
    }

    // Layers as presented to operator (shuffled)
    const shuffledLayers = shuffledOrder.map(i => layers[i]);

    const timeLimit = TIME_LIMITS[difficulty];

    const observerData = {
      combinedPattern: combined,
      correctOrder: correctOrder,
      layers: layers,
      layerCount,
    };

    const operatorData = {
      layers: shuffledLayers,
      layerCount,
    };

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { layerCount },
      roleData: {
        observer: observerData,
        operator: operatorData,
        navigator: observerData,
        hacker: observerData,
      },
      timeLimit,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'stack') {
          return { correct: false, penalty: 0, feedback: '不明なアクション。' };
        }

        const { order } = action.data as { order: number[] };

        if (!order || order.length !== layerCount) {
          return { correct: false, penalty: 0, feedback: `${layerCount}枚のレイヤー順序を指定してください。` };
        }

        // The operator submits indices into the shuffled array.
        // Map back to original indices and check if they match correctOrder.
        const submittedOriginal = order.map(i => shuffledOrder[i]);
        const isCorrect = submittedOriginal.every((val, idx) => val === correctOrder[idx]);

        if (isCorrect) {
          return { correct: true, penalty: 0, feedback: 'レイヤー重ね完了！パターンが一致しました。', solved: true };
        }

        return {
          correct: false,
          penalty: 10,
          feedback: 'レイヤー順序が正しくありません。再配置してください。',
        };
      },
    };

    return instance;
  }
}
