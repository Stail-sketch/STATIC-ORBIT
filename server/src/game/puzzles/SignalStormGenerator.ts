// ===== STATIC ORBIT — Signal Storm Boss Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';

type TargetShape = 'circle' | 'square' | 'triangle' | 'diamond';
type TargetColor = 'red' | 'blue' | 'green' | 'yellow' | 'cyan' | 'magenta';

interface SignalTarget {
  id: string;
  x: number;
  y: number;
  shape: TargetShape;
  color: TargetColor;
  isReal: boolean;
  round: number;
}

const GRID_SIZE = 6;
const SHAPES: TargetShape[] = ['circle', 'square', 'triangle', 'diamond'];
const COLORS: TargetColor[] = ['red', 'blue', 'green', 'yellow', 'cyan', 'magenta'];

function captureTargetForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 6;
    case 'normal': return 8;
    case 'hard': return 10;
    case 'extreme': return 12;
  }
}

function roundsForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 4;
    case 'normal': return 5;
    case 'hard': return 6;
    case 'extreme': return 7;
  }
}

function targetsPerRound(difficulty: Difficulty): [number, number] {
  switch (difficulty) {
    case 'easy': return [3, 4];
    case 'normal': return [3, 5];
    case 'hard': return [4, 5];
    case 'extreme': return [4, 6];
  }
}

function generateTargets(totalRounds: number, difficulty: Difficulty): {
  targets: SignalTarget[];
  realShape: TargetShape;
  realColor: TargetColor;
} {
  const realShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const realColor = COLORS[Math.floor(Math.random() * COLORS.length)];

  const [minTargets, maxTargets] = targetsPerRound(difficulty);
  const targets: SignalTarget[] = [];
  let idCounter = 0;

  for (let round = 0; round < totalRounds; round++) {
    const count = Math.floor(Math.random() * (maxTargets - minTargets + 1)) + minTargets;
    // At least 1 real target per round, rest mixed
    const realCount = Math.max(1, Math.floor(count * 0.4));
    const decoyCount = count - realCount;

    const usedPositions = new Set<string>();

    const pickPosition = (): { x: number; y: number } => {
      let x: number, y: number;
      do {
        x = Math.floor(Math.random() * GRID_SIZE);
        y = Math.floor(Math.random() * GRID_SIZE);
      } while (usedPositions.has(`${x},${y}`));
      usedPositions.add(`${x},${y}`);
      return { x, y };
    };

    // Real targets
    for (let i = 0; i < realCount; i++) {
      const pos = pickPosition();
      targets.push({
        id: `t${idCounter++}`,
        x: pos.x,
        y: pos.y,
        shape: realShape,
        color: realColor,
        isReal: true,
        round,
      });
    }

    // Decoy targets (different shape or color)
    for (let i = 0; i < decoyCount; i++) {
      const pos = pickPosition();
      let shape: TargetShape;
      let color: TargetColor;

      // Ensure decoy differs in at least one attribute
      if (Math.random() > 0.5) {
        shape = SHAPES.filter(s => s !== realShape)[Math.floor(Math.random() * (SHAPES.length - 1))];
        color = COLORS[Math.floor(Math.random() * COLORS.length)];
      } else {
        shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        color = COLORS.filter(c => c !== realColor)[Math.floor(Math.random() * (COLORS.length - 1))];
      }

      targets.push({
        id: `t${idCounter++}`,
        x: pos.x,
        y: pos.y,
        shape,
        color,
        isReal: false,
        round,
      });
    }
  }

  return { targets, realShape, realColor };
}

export class SignalStormGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'signal-storm';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const totalRounds = roundsForDifficulty(difficulty);
    const captureTarget = captureTargetForDifficulty(difficulty);
    const { targets, realShape, realColor } = generateTargets(totalRounds, difficulty);

    let capturedReal = 0;
    let missCount = 0;
    const capturedIds = new Set<string>();

    const SHAPE_JP: Record<TargetShape, string> = {
      circle: '円',
      square: '四角',
      triangle: '三角',
      diamond: 'ひし形',
    };

    const COLOR_JP: Record<TargetColor, string> = {
      red: '赤',
      blue: '青',
      green: '緑',
      yellow: '黄',
      cyan: 'シアン',
      magenta: 'マゼンタ',
    };

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: {
        gridSize: GRID_SIZE,
        totalRounds,
        captureTarget,
      },
      roleData: {
        observer: {
          realSignal: {
            shape: realShape,
            color: realColor,
            shapeJP: SHAPE_JP[realShape],
            colorJP: COLOR_JP[realColor],
          },
          targets: targets.map(t => ({
            id: t.id,
            x: t.x,
            y: t.y,
            shape: t.shape,
            color: t.color,
            isReal: t.isReal,
            round: t.round,
          })),
          captureTarget,
          description: `本物のシグナルは「${COLOR_JP[realColor]}の${SHAPE_JP[realShape]}」です。オペレーターに伝えてください。`,
        },
        operator: {
          targets: targets.map(t => ({
            id: t.id,
            x: t.x,
            y: t.y,
            shape: t.shape,
            color: t.color,
            round: t.round,
          })),
          gridSize: GRID_SIZE,
          totalRounds,
          captureTarget,
          description: 'ターゲットが出現します。どれが本物かはオブザーバーに確認してください。',
        },
        navigator: {
          realSignal: {
            shape: realShape,
            color: realColor,
            shapeJP: SHAPE_JP[realShape],
            colorJP: COLOR_JP[realColor],
          },
          targets: targets.map(t => ({
            id: t.id,
            x: t.x,
            y: t.y,
            shape: t.shape,
            color: t.color,
            isReal: t.isReal,
            round: t.round,
          })),
          captureTarget,
          description: '本物の情報が見えます。オブザーバーと協力して指示を出してください。',
        },
        hacker: {
          realSignal: {
            shape: realShape,
            shapeJP: SHAPE_JP[realShape],
          },
          captureTarget,
          description: '本物の形状だけ見えます。色はオブザーバーに確認してください。',
        },
      },
      timeLimit: 999,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'capture') {
          return { correct: false, penalty: 0, feedback: '不明なアクション。' };
        }

        const { targetId } = action.data as { targetId: string };

        if (!targetId) {
          return { correct: false, penalty: 0, feedback: 'ターゲットIDが指定されていません。' };
        }

        if (capturedIds.has(targetId)) {
          return { correct: false, penalty: 0, feedback: 'このターゲットは既にキャプチャ済みです。' };
        }

        const target = targets.find(t => t.id === targetId);
        if (!target) {
          return { correct: false, penalty: 0, feedback: '無効なターゲットID。' };
        }

        capturedIds.add(targetId);

        if (target.isReal) {
          capturedReal++;
          const solved = capturedReal >= captureTarget;
          return {
            correct: true,
            penalty: 0,
            feedback: `シグナルキャプチャ成功！ (${capturedReal}/${captureTarget})`,
            solved,
          };
        }

        missCount++;
        return {
          correct: false,
          penalty: 0,
          feedback: `デコイをキャプチャ。ミス +1 (ミス合計: ${missCount})`,
        };
      },
    };

    return instance;
  }
}
