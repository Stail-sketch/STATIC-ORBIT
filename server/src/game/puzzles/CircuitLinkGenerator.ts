// ===== STATIC ORBIT — Circuit Link Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';
import { TIME_LIMITS } from './PuzzleGenerator.js';

const WIRE_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'white'] as const;

interface WireConnection {
  color: string;
  sourcePort: string;
  destPort: string;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function wireCountForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 4;
    case 'normal': return 5;
    case 'hard': return 6;
    case 'extreme': return 8;
  }
}

export class CircuitLinkGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'circuit-link';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const wireCount = wireCountForDifficulty(difficulty);
    const colors = shuffle([...WIRE_COLORS]).slice(0, wireCount);

    const sourcePorts = Array.from({ length: wireCount }, (_, i) => `S${i + 1}`);
    const destPorts = shuffle(Array.from({ length: wireCount }, (_, i) => `D${i + 1}`));

    const connections: WireConnection[] = colors.map((color, i) => ({
      color,
      sourcePort: sourcePorts[i],
      destPort: destPorts[i],
    }));

    // Build the answer map: color → destPort
    const answerMap: Record<string, string> = {};
    for (const conn of connections) {
      answerMap[conn.color] = conn.destPort;
    }

    // Track which wires have been correctly connected
    const connectedWires = new Set<string>();

    const timeLimit = TIME_LIMITS[difficulty];

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { wireCount },
      roleData: {
        observer: {
          connectionMap: connections.map(c => ({
            color: c.color,
            sourcePort: c.sourcePort,
            destPort: c.destPort,
          })),
        },
        operator: {
          wireColors: shuffle([...colors]),
          sourcePorts: [...sourcePorts],
          destPorts: shuffle([...destPorts]),
        },
      },
      timeLimit,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'connect-wire') {
          return { correct: false, penalty: 0, feedback: '不明なアクション。' };
        }

        const { color, destPort } = action.data as { color: string; destPort: string };

        if (!color || !destPort) {
          return { correct: false, penalty: 0, feedback: 'ワイヤー色または出力ポートが未指定。' };
        }

        if (connectedWires.has(color)) {
          return { correct: false, penalty: 0, feedback: `ワイヤー${color}は既に接続済み。` };
        }

        if (answerMap[color] === destPort) {
          connectedWires.add(color);
          const solved = connectedWires.size === wireCount;
          return {
            correct: true,
            penalty: 0,
            feedback: `ワイヤー${color}を${destPort}に接続完了。`,
            solved,
          };
        }

        return {
          correct: false,
          penalty: 15,
          feedback: `ワイヤー${color}の接続先が違う。`,
        };
      },
    };

    return instance;
  }
}
