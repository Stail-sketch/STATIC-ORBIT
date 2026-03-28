// ===== STATIC ORBIT — Orbit Calc Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';
import { TIME_LIMITS } from './PuzzleGenerator.js';

interface OrbitalParameter {
  name: string;
  targetValue: number;
  tolerance: number;
  unit: string;
  min: number;
  max: number;
  step: number;
}

function tolerance(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 10;
    case 'normal': return 5;
    case 'hard': return 3;
    case 'extreme': return 1;
  }
}

function paramCount(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 2;
    case 'normal': return 3;
    case 'hard': return 3;
    case 'extreme': return 3;
  }
}

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const PARAM_TEMPLATES: { name: string; min: number; max: number; step: number; unit: string }[] = [
  { name: 'Azimuth Angle', min: 0, max: 360, step: 1, unit: '°' },
  { name: 'Thrust Output', min: 0, max: 100, step: 1, unit: '%' },
  { name: 'Burn Timing', min: 0, max: 60, step: 1, unit: 's' },
];

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class OrbitCalcGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'orbit-calc';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const count = paramCount(difficulty);
    const tol = tolerance(difficulty);
    const templates = shuffle([...PARAM_TEMPLATES]).slice(0, count);

    const parameters: OrbitalParameter[] = templates.map(t => ({
      name: t.name,
      targetValue: randomInRange(t.min + tol, t.max - tol), // ensure tolerance fits in range
      tolerance: tol,
      unit: t.unit,
      min: t.min,
      max: t.max,
      step: t.step,
    }));

    // Generate random starting values for the operator (far from targets)
    const currentValues: number[] = parameters.map(p => {
      let v: number;
      do {
        v = randomInRange(p.min, p.max);
      } while (Math.abs(v - p.targetValue) < p.tolerance * 3);
      return v;
    });

    // Track which params are locked (calibrated correctly)
    const locked = new Set<number>();

    const timeLimit = TIME_LIMITS[difficulty];

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { paramCount: count, lockedParams: [] as number[] },
      roleData: {
        observer: {
          targets: parameters.map(p => ({
            name: p.name,
            targetValue: p.targetValue,
            tolerance: p.tolerance,
            unit: p.unit,
          })),
        },
        operator: {
          parameters: parameters.map((p, i) => ({
            name: p.name,
            currentValue: currentValues[i],
            min: p.min,
            max: p.max,
            step: p.step,
            unit: p.unit,
          })),
        },
      },
      timeLimit,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'calibrate') {
          return { correct: false, penalty: 0, feedback: '不明なアクション。' };
        }

        const { paramIndex, value } = action.data as { paramIndex: number; value: number };

        if (typeof paramIndex !== 'number' || typeof value !== 'number') {
          return { correct: false, penalty: 0, feedback: '無効なキャリブレーションデータ。' };
        }

        if (paramIndex < 0 || paramIndex >= count) {
          return { correct: false, penalty: 0, feedback: '無効なパラメータ番号。' };
        }

        if (locked.has(paramIndex)) {
          return { correct: false, penalty: 0, feedback: `${parameters[paramIndex].name}は既にロック済み。` };
        }

        const param = parameters[paramIndex];

        // Update current value in shared data
        currentValues[paramIndex] = value;

        // Check if within tolerance
        const diff = Math.abs(value - param.targetValue);
        if (diff <= param.tolerance) {
          locked.add(paramIndex);

          // Update shared data
          (instance.sharedData as Record<string, unknown>).lockedParams = [...locked];

          const allLocked = locked.size === count;
          return {
            correct: true,
            penalty: 0,
            feedback: `${param.name}を${value}${param.unit}でロック。` +
              (allLocked ? '全パラメータ較正完了。' : `残り${count - locked.size}個。`),
            solved: allLocked,
          };
        }

        // Give directional hint based on proximity
        const direction = value < param.targetValue ? '上げろ' : '下げろ';
        const proximity = diff <= param.tolerance * 3 ? '近い' : 'ずれている';

        return {
          correct: false,
          penalty: 5,
          feedback: `${param.name}: ${proximity}。もっと${direction}。`,
        };
      },
    };

    return instance;
  }
}
