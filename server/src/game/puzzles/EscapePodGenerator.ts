// ===== STATIC ORBIT — Escape Pod Boss Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';

interface SubsystemSolution {
  power: string;        // 4-digit code e.g. "4729"
  seal: boolean[];      // 6 switches
  nav: { x: number; y: number; z: number };  // coordinates with Z
  thrust: number;       // percentage 0-100 (exact match required)
  comms: string;        // 3-digit frequency e.g. "347"
}

const SUBSYSTEM_ORDER = ['power', 'seal', 'nav', 'thrust', 'comms'] as const;
const SUBSYSTEM_NAMES: Record<string, string> = {
  power: '電源',
  seal: '気密',
  nav: 'ナビ',
  thrust: '推進',
  comms: '通信',
};

function generateSolution(difficulty: Difficulty): SubsystemSolution {
  const powerCode = String(Math.floor(Math.random() * 9000) + 1000); // 1000-9999

  const seal = Array.from({ length: 6 }, () => Math.random() > 0.5);

  const navRange = difficulty === 'easy' ? 50 : difficulty === 'normal' ? 100 : 200;
  const nav = {
    x: Math.floor(Math.random() * navRange) - Math.floor(navRange / 2),
    y: Math.floor(Math.random() * navRange) - Math.floor(navRange / 2),
    z: Math.floor(Math.random() * navRange) - Math.floor(navRange / 2),
  };

  const thrust = Math.floor(Math.random() * 81) + 20; // 20-100

  const commsFreq = String(Math.floor(Math.random() * 900) + 100); // 100-999

  return { power: powerCode, seal, nav, thrust, comms: commsFreq };
}

export class EscapePodGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'escape-pod';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const solution = generateSolution(difficulty);
    const completedSystems = new Set<string>();
    let currentSystemIndex = 0;

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: {
        subsystemOrder: [...SUBSYSTEM_ORDER],
        subsystemNames: { ...SUBSYSTEM_NAMES },
      },
      roleData: {
        observer: {
          solutions: {
            power: solution.power,
            seal: solution.seal,
            nav: `X:${solution.nav.x}, Y:${solution.nav.y}, Z:${solution.nav.z}`,
            thrust: `${solution.thrust}%`,
            comms: solution.comms,
          },
          subsystemOrder: [...SUBSYSTEM_ORDER],
          description: '全サブシステムの解答が見えます。順番にオペレーターに伝えてください。',
        },
        operator: {
          subsystemOrder: [...SUBSYSTEM_ORDER],
          subsystemNames: { ...SUBSYSTEM_NAMES },
          description: '5つのサブシステムを順番に起動してください。オブザーバーの指示に従ってください。',
        },
        navigator: {
          solutions: {
            power: solution.power,
            seal: solution.seal,
            nav: `X:${solution.nav.x}, Y:${solution.nav.y}, Z:${solution.nav.z}`,
            thrust: `${solution.thrust}%`,
            comms: solution.comms,
          },
          subsystemOrder: [...SUBSYSTEM_ORDER],
          description: '全解答が見えます。オブザーバーと連携して指示を出してください。',
        },
        hacker: {
          solutions: {
            power: solution.power,
            nav: `X:${solution.nav.x}, Y:${solution.nav.y}, Z:${solution.nav.z}`,
          },
          subsystemOrder: [...SUBSYSTEM_ORDER],
          description: '電源とナビの解答が見えます。残りはオブザーバーに確認してください。',
        },
      },
      timeLimit: 120,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'subsystem') {
          return { correct: false, penalty: 0, feedback: '不明なアクション。' };
        }

        const { system, answer } = action.data as { system: string; answer: unknown };

        if (!system || !SUBSYSTEM_ORDER.includes(system as typeof SUBSYSTEM_ORDER[number])) {
          return { correct: false, penalty: 0, feedback: '無効なサブシステム。' };
        }

        if (completedSystems.has(system)) {
          return { correct: false, penalty: 0, feedback: `${SUBSYSTEM_NAMES[system]}は既に起動済み。` };
        }

        const expectedSystem = SUBSYSTEM_ORDER[currentSystemIndex];
        if (system !== expectedSystem) {
          return {
            correct: false,
            penalty: 0,
            feedback: `順序が違います。次は「${SUBSYSTEM_NAMES[expectedSystem]}」を起動してください。`,
          };
        }

        let correct = false;

        switch (system) {
          case 'power': {
            correct = String(answer) === solution.power;
            if (!correct) {
              return { correct: false, penalty: 5, feedback: '電源コードが違います。4桁のコードを入力してください。' };
            }
            break;
          }
          case 'seal': {
            const switches = answer as boolean[];
            if (!Array.isArray(switches) || switches.length !== 6) {
              return { correct: false, penalty: 0, feedback: '6つのスイッチ状態を配列で指定してください。' };
            }
            correct = switches.every((v, i) => v === solution.seal[i]);
            if (!correct) {
              return { correct: false, penalty: 5, feedback: '気密スイッチパターンが一致しません。' };
            }
            break;
          }
          case 'nav': {
            const coords = answer as { x: number; y: number; z: number };
            if (coords == null || coords.x == null || coords.y == null || coords.z == null) {
              return { correct: false, penalty: 0, feedback: '座標をX, Y, Z形式で指定してください。' };
            }
            correct = coords.x === solution.nav.x && coords.y === solution.nav.y && coords.z === solution.nav.z;
            if (!correct) {
              return { correct: false, penalty: 5, feedback: 'ナビ座標が一致しません。' };
            }
            break;
          }
          case 'thrust': {
            const thrustVal = Number(answer);
            if (isNaN(thrustVal)) {
              return { correct: false, penalty: 0, feedback: '推力をパーセンテージで入力してください。' };
            }
            correct = thrustVal === solution.thrust;
            if (!correct) {
              return { correct: false, penalty: 5, feedback: '推力が目標値と一致しません。正確な値を入力してください。' };
            }
            break;
          }
          case 'comms': {
            correct = String(answer) === solution.comms;
            if (!correct) {
              return { correct: false, penalty: 5, feedback: '通信周波数が違います。3桁の周波数を入力してください。' };
            }
            break;
          }
        }

        completedSystems.add(system);
        currentSystemIndex++;

        const allDone = completedSystems.size === SUBSYSTEM_ORDER.length;

        return {
          correct: true,
          penalty: 0,
          feedback: allDone
            ? '全サブシステム起動完了！ 脱出ポッド発射準備完了！'
            : `${SUBSYSTEM_NAMES[system]}起動成功。次: ${SUBSYSTEM_NAMES[SUBSYSTEM_ORDER[currentSystemIndex]]}`,
          solved: allDone,
        };
      },
    };

    return instance;
  }
}
