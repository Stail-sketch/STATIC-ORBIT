// ===== STATIC ORBIT — Airlock Sync Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';
import { TIME_LIMITS } from './PuzzleGenerator.js';

type GaugeSpeed = 'slow' | 'medium' | 'fast';

interface GaugeConfig {
  index: number;
  speed: GaugeSpeed;
  greenZoneStart: number;
  greenZoneEnd: number;
}

function gaugeCountForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 2;
    case 'normal': return 2;
    case 'hard': return 3;
    case 'extreme': return 3;
  }
}

function greenZoneWidthForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 0.35;
    case 'normal': return 0.25;
    case 'hard': return 0.18;
    case 'extreme': return 0.12;
  }
}

function toleranceForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 0.05;
    case 'normal': return 0.03;
    case 'hard': return 0.02;
    case 'extreme': return 0.01;
  }
}

const SPEEDS: GaugeSpeed[] = ['slow', 'medium', 'fast'];

function generateGauge(index: number, width: number): GaugeConfig {
  const speed = SPEEDS[Math.floor(Math.random() * SPEEDS.length)];
  const start = Math.round(Math.random() * (1 - width) * 100) / 100;
  return {
    index,
    speed,
    greenZoneStart: start,
    greenZoneEnd: Math.round((start + width) * 100) / 100,
  };
}

export class AirlockSyncGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'airlock-sync';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const gaugeCount = gaugeCountForDifficulty(difficulty);
    const zoneWidth = greenZoneWidthForDifficulty(difficulty);
    const tolerance = toleranceForDifficulty(difficulty);

    const gauges: GaugeConfig[] = Array.from({ length: gaugeCount }, (_, i) =>
      generateGauge(i, zoneWidth)
    );

    const timeLimit = TIME_LIMITS[difficulty];

    const observerData = {
      gauges: gauges.map(g => ({
        index: g.index,
        speed: g.speed,
        greenZoneStart: g.greenZoneStart,
        greenZoneEnd: g.greenZoneEnd,
      })),
      gaugeCount,
    };

    const operatorData = {
      gaugeCount,
      gauges: gauges.map(g => ({
        index: g.index,
        speed: g.speed,
      })),
    };

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { gaugeCount },
      roleData: {
        observer: observerData,
        operator: operatorData,
        navigator: observerData,
        hacker: observerData,
      },
      timeLimit,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'sync-press') {
          return { correct: false, penalty: 0, feedback: '不明なアクション。' };
        }

        const { phases } = action.data as { phases: number[] };

        if (!phases || phases.length !== gaugeCount) {
          return { correct: false, penalty: 0, feedback: `${gaugeCount}個のゲージ位相を送信してください。` };
        }

        const failedGauges: number[] = [];

        for (let i = 0; i < gaugeCount; i++) {
          const phase = phases[i];
          const gauge = gauges[i];
          const inZone =
            phase >= gauge.greenZoneStart - tolerance &&
            phase <= gauge.greenZoneEnd + tolerance;

          if (!inZone) {
            failedGauges.push(i + 1);
          }
        }

        if (failedGauges.length === 0) {
          return { correct: true, penalty: 0, feedback: 'エアロック同期成功！全ゲージがグリーンゾーン内。', solved: true };
        }

        return {
          correct: false,
          penalty: 10,
          feedback: `同期失敗: ゲージ${failedGauges.join(', ')}がグリーンゾーン外です。`,
        };
      },
    };

    return instance;
  }
}
