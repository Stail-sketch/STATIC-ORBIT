// ===== STATIC ORBIT — Echo Override Boss Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';

interface CodeLine {
  index: number;
  text: string;
  isValid: boolean;
}

const VALID_PATTERNS = ['GHOST', 'override', '0xDEAD', '0xBEEF', 'ECHO', 'STATIC', '0xFF00'];

const NOISE_FRAGMENTS = [
  'sys.kernel.load(0x00)',
  'memalloc(512, HEAP)',
  'io.stream.flush()',
  'net.socket.bind(8080)',
  'proc.spawn("/bin/sh")',
  'fs.read("/dev/null")',
  'timer.set(1000, LOOP)',
  'buf.write(0x00, 256)',
  'log.trace("heartbeat")',
  'crypto.hash("sha256")',
  'env.get("PATH")',
  'thread.yield()',
  'mutex.lock(0x0F)',
  'signal.raise(SIGTERM)',
  'pipe.open("/tmp/fifo")',
  'db.query("SELECT 1")',
  'cache.invalidate(ALL)',
  'queue.push(MSG_TICK)',
  'rng.seed(Date.now())',
  'gc.collect(FULL)',
  // Convincing noise lines that look similar to valid patterns
  'sys.GH0ST.inject(0xBB)',
  'override_protocol(BACKUP)',
  'mem.write(0xDEAF, payload)',
  'net.ECH0.broadcast(sig)',
  'proc.overide.exec(root)',
  'GH0ST.wire.activate()',
  'buf.load(0xBEFF, 1024)',
  'STATIK.orbit.sync()',
  'core.ECH0.respond(ACK)',
  'overrride.layer(3, DEEP)',
  'io.GH0ST.channel.open()',
  'hex.decode(0xFF01, OUT)',
  'ECH0.pulse.emit(FREQ)',
  'sys.STATC.lock(false)',
  'data.0xDE4D.route(proxy)',
  'STATI0N.core.breach(KEY)',
  'net.echo_local.ping()',
  'sys.ghost_cache.clear()',
  'static_var.init(NULL)',
  'buf.0xBEEP.flush(OUT)',
];

const VALID_LINE_TEMPLATES = [
  'sys.GHOST.inject(0xAA)',
  'override.protocol(MAIN)',
  'mem.write(0xDEAD, payload)',
  'net.ECHO.broadcast(sig)',
  'proc.override.exec(root)',
  'GHOST.wire.activate()',
  'buf.load(0xBEEF, 1024)',
  'STATIC.orbit.sync()',
  'core.ECHO.respond(ACK)',
  'override.layer(3, DEEP)',
  'io.GHOST.channel.open()',
  'hex.decode(0xFF00, OUT)',
  'ECHO.pulse.emit(FREQ)',
  'sys.STATIC.lock(false)',
  'GHOST.trace.enable(ALL)',
  'data.override.commit(TX)',
  'net.0xDEAD.route(proxy)',
  'STATIC.core.breach(KEY)',
];

function lineCountForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 30;
    case 'normal': return 40;
    case 'hard': return 50;
    case 'extreme': return 60;
  }
}

function validCountForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 10;
    case 'normal': return 13;
    case 'hard': return 16;
    case 'extreme': return 19;
  }
}

function targetForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 8;
    case 'normal': return 11;
    case 'hard': return 14;
    case 'extreme': return 17;
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

function generateCodeLines(totalLines: number, validCount: number): { lines: CodeLine[]; pattern: string } {
  // Pick a pattern for this run
  const pattern = VALID_PATTERNS[Math.floor(Math.random() * VALID_PATTERNS.length)];

  // Pick valid lines that contain the pattern
  const matchingTemplates = VALID_LINE_TEMPLATES.filter(t => t.includes(pattern));
  const validTemplates = shuffle(matchingTemplates).slice(0, Math.min(validCount, matchingTemplates.length));

  // If we need more, generate some
  while (validTemplates.length < validCount) {
    const extra = `data.${pattern}.process(${Math.floor(Math.random() * 256)})`;
    validTemplates.push(extra);
  }

  // Pick noise lines (ensure they don't accidentally contain the pattern)
  const noiseCount = totalLines - validCount;
  const filteredNoise = NOISE_FRAGMENTS.filter(n => !n.includes(pattern));
  const noiseLines: string[] = [];
  for (let i = 0; i < noiseCount; i++) {
    noiseLines.push(filteredNoise[i % filteredNoise.length]);
  }

  // Build all lines and shuffle
  const allLines: CodeLine[] = [];
  for (const text of validTemplates) {
    allLines.push({ index: 0, text, isValid: true });
  }
  for (const text of noiseLines) {
    allLines.push({ index: 0, text, isValid: false });
  }

  const shuffled = shuffle(allLines);
  shuffled.forEach((line, i) => { line.index = i; });

  return { lines: shuffled, pattern };
}

export class EchoOverrideGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'echo-override';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const totalLines = lineCountForDifficulty(difficulty);
    const validCount = validCountForDifficulty(difficulty);
    const target = targetForDifficulty(difficulty);

    const { lines, pattern } = generateCodeLines(totalLines, validCount);

    let score = 0;
    const selectedLines = new Set<number>();

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: {
        totalLines,
        target,
      },
      roleData: {
        observer: {
          pattern,
          hint: `「${pattern}」を含む行を選択せよ`,
          validIndices: lines.filter(l => l.isValid).map(l => l.index),
          description: '有効な行のパターンが見えます。オペレーターに検索パターンを伝えてください。',
        },
        operator: {
          codeLines: lines.map(l => ({ index: l.index, text: l.text })),
          target,
          description: 'コード行がスクロールしています。指示されたパターンを含む行を選択してください。',
        },
        navigator: {
          pattern,
          hint: `「${pattern}」を含む行を選択せよ`,
          validIndices: lines.filter(l => l.isValid).map(l => l.index),
          description: 'パターン情報が見えます。オブザーバーと協力して指示を出してください。',
        },
        hacker: {
          pattern,
          hint: `「${pattern}」を含む行を選択せよ`,
          description: 'パターンは見えますが、有効行のインデックスは見えません。',
        },
      },
      timeLimit: 180,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'select-line') {
          return { correct: false, penalty: 0, feedback: '不明なアクション。' };
        }

        const { lineIndex } = action.data as { lineIndex: number };

        if (lineIndex == null || lineIndex < 0 || lineIndex >= totalLines) {
          return { correct: false, penalty: 0, feedback: '無効な行番号。' };
        }

        if (selectedLines.has(lineIndex)) {
          return { correct: false, penalty: 0, feedback: `行${lineIndex}は既に選択済み。` };
        }

        selectedLines.add(lineIndex);

        const line = lines[lineIndex];

        if (line.isValid) {
          score++;
          const solved = score >= target;
          return {
            correct: true,
            penalty: 0,
            feedback: `有効行を検出！ (${score}/${target})`,
            solved,
          };
        }

        score -= 2;
        return {
          correct: false,
          penalty: 0,
          feedback: `ノイズ行を選択。-2ポイント。 (${score}/${target})`,
        };
      },
    };

    return instance;
  }
}
