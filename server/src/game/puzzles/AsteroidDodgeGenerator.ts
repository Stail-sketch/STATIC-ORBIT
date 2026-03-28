// ===== STATIC ORBIT — Asteroid Dodge Boss Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';

const LANE_COUNT = 7;
const START_POSITION = 3;

function wavesForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 15;
    case 'normal': return 20;
    case 'hard': return 25;
    case 'extreme': return 30;
  }
}

function blockedLanesForDifficulty(difficulty: Difficulty): [number, number] {
  switch (difficulty) {
    case 'easy': return [2, 3];
    case 'normal': return [2, 4];
    case 'hard': return [3, 4];
    case 'extreme': return [3, 5];
  }
}

function generateAsteroidPattern(totalWaves: number, difficulty: Difficulty): number[][] {
  const [minBlocked, maxBlocked] = blockedLanesForDifficulty(difficulty);
  const pattern: number[][] = [];

  for (let w = 0; w < totalWaves; w++) {
    const blockedCount = Math.floor(Math.random() * (maxBlocked - minBlocked + 1)) + minBlocked;
    const lanes = Array.from({ length: LANE_COUNT }, (_, i) => i);
    // Shuffle and pick blocked lanes
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
    }
    const blocked = lanes.slice(0, blockedCount).sort((a, b) => a - b);
    pattern.push(blocked);
  }

  return pattern;
}

export class AsteroidDodgeGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'asteroid-dodge';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const totalWaves = wavesForDifficulty(difficulty);
    const asteroidPattern = generateAsteroidPattern(totalWaves, difficulty);

    let currentWave = 0;
    let shipPosition = START_POSITION;
    let survivedWaves = 0;

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: {
        laneCount: LANE_COUNT,
        totalWaves,
      },
      roleData: {
        observer: {
          asteroidPattern,
          laneCount: LANE_COUNT,
          totalWaves,
          description: '全小惑星パターンが見えます。オペレーターに安全なレーンを指示してください。',
        },
        operator: {
          laneCount: LANE_COUNT,
          startPosition: START_POSITION,
          targetWaves: totalWaves,
          visibleWaves: 2,
          description: '船を操縦してください。次の1-2波しか見えません。ナビゲーターの指示に従ってください。',
        },
        navigator: {
          asteroidPattern,
          laneCount: LANE_COUNT,
          totalWaves,
          description: '全パターンを把握。安全な進路をオペレーターに伝えてください。',
        },
        hacker: {
          asteroidPattern: asteroidPattern.slice(0, Math.ceil(totalWaves * 0.6)),
          laneCount: LANE_COUNT,
          totalWaves,
          description: 'パターンの一部が見えます。オブザーバーと協力して情報を補完してください。',
        },
      },
      timeLimit: 999,

      validate(action: GameAction): ValidationResult {
        if (action.action === 'move') {
          const { position } = action.data as { position: number };
          if (position == null || position < 0 || position >= LANE_COUNT) {
            return { correct: false, penalty: 0, feedback: '無効なレーン位置。0〜6の範囲で指定してください。' };
          }
          shipPosition = position;
          return { correct: true, penalty: 0, feedback: `船をレーン${position}に移動。` };
        }

        if (action.action === 'tick') {
          const { currentPosition } = action.data as { currentPosition: number };
          if (currentPosition != null) {
            shipPosition = currentPosition;
          }

          if (currentWave >= totalWaves) {
            return { correct: true, penalty: 0, feedback: '全ウェーブ突破！', solved: true };
          }

          const blockedLanes = asteroidPattern[currentWave];
          const hit = blockedLanes.includes(shipPosition);

          currentWave++;

          if (hit) {
            return {
              correct: false,
              penalty: 0,
              feedback: `ウェーブ${currentWave}: 小惑星に衝突！ (レーン${shipPosition})`,
            };
          }

          survivedWaves++;
          const solved = survivedWaves >= totalWaves;
          return {
            correct: true,
            penalty: 0,
            feedback: `ウェーブ${currentWave}/${totalWaves}: 回避成功。`,
            solved,
          };
        }

        return { correct: false, penalty: 0, feedback: '不明なアクション。' };
      },
    };

    return instance;
  }
}
