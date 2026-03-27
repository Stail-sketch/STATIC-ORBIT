// ===== STATIC ORBIT — Game Engine =====

import type { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Difficulty,
  GameAction,
  GameResult,
  PuzzleType,
  Rank,
  Room,
  StagePhase,
  StageScore,
} from '../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './puzzles/PuzzleGenerator.js';
import { CircuitLinkGenerator } from './puzzles/CircuitLinkGenerator.js';
import { CipherBreakGenerator } from './puzzles/CipherBreakGenerator.js';
import { GridSyncGenerator } from './puzzles/GridSyncGenerator.js';
import { FreqTuneGenerator } from './puzzles/FreqTuneGenerator.js';
import { MorseDecodeGenerator } from './puzzles/MorseDecodeGenerator.js';
import { MemoryChainGenerator } from './puzzles/MemoryChainGenerator.js';
import { HackTerminalGenerator } from './puzzles/HackTerminalGenerator.js';
import { SpatialNavGenerator } from './puzzles/SpatialNavGenerator.js';
import { ReflexBurstGenerator } from './puzzles/ReflexBurstGenerator.js';
import { LogicGateGenerator } from './puzzles/LogicGateGenerator.js';
import { OrbitCalcGenerator } from './puzzles/OrbitCalcGenerator.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

// ---- Story briefing texts ----

const INFILTRATION_BRIEFINGS: Record<PuzzleType, (stageNum: number) => string> = {
  'circuit-link': (n) =>
    `GHOST WIRE UPLINK ESTABLISHED... Targeting Section ${n} security grid. Reroute the circuit pathways to bypass the firewall.`,
  'cipher-break': (n) =>
    `WARNING: Firewall detected. Cipher encryption active on data stream ${n}. Decode the transmission before the trace locks on.`,
  'grid-sync': (n) =>
    `GRID MATRIX ONLINE. Pattern synchronization required for bulkhead ${n} access. Match the configuration exactly.`,
  'freq-tune': (_n) => `GHOST WIRE // Jamming signal detected on comm array. Manual frequency calibration required to bypass interference.`,
  'morse-decode': (_n) => `GHOST WIRE // Intercepted encoded transmission from ARKTIS internal network. Decode the signal.`,
  'memory-chain': (_n) => `GHOST WIRE // Security panel requires biometric sequence input. Pattern captured from surveillance feed.`,
  'hack-terminal': (_n) => `GHOST WIRE // Direct terminal access obtained. Execute command injection sequence.`,
  'spatial-nav': (_n) => `GHOST WIRE // Navigating through maintenance corridors. Observer has the station blueprint — guide the operative to the access point.`,
  'reflex-burst': (_n) => `GHOST WIRE // Security drone patrol detected. Execute bypass sequence with precise timing.`,
  'logic-gate': (_n) => `GHOST WIRE // Multi-layer encryption on the data vault. Logic matrix must be solved to proceed.`,
  'orbit-calc': (_n) => `GHOST WIRE // Adjusting approach vector to avoid detection grid. Calibrate orbital parameters.`,
};

const ESCAPE_BRIEFINGS: Record<PuzzleType, (stageNum: number) => string> = {
  'circuit-link': (n) =>
    `ECHO: ...You thought you could hide? Rerouting power grid ${n}. System lockdown imminent. Reconnect NOW.`,
  'cipher-break': (n) =>
    `ECHO: Encryption layer ${n} deployed. Your signal is fading. Decode or be erased from the network.`,
  'grid-sync': (n) =>
    `ECHO: Bulkhead ${n} sealing. Emergency pattern override required. Sync or be trapped.`,
  'freq-tune': (_n) => `ECHO: Your comms are mine now. Can you even hear each other through the static?`,
  'morse-decode': (_n) => `ECHO: I'm broadcasting on ALL frequencies. Decode this... if you can keep up.`,
  'memory-chain': (_n) => `ECHO: I've scrambled the locks. Your memory against my processing power. Amusing.`,
  'hack-terminal': (_n) => `ECHO: Type faster, little hackers. The airlock countdown won't wait.`,
  'spatial-nav': (_n) => `ECHO: The corridors are shifting. Your map means nothing now.`,
  'reflex-burst': (_n) => `ECHO: Let's see your reflexes. I control the rhythm now.`,
  'logic-gate': (_n) => `ECHO: Logic? How rational of you. Solve my riddle or suffocate.`,
  'orbit-calc': (_n) => `ECHO: Miscalculate by a fraction and you'll burn in atmosphere.`,
};

const PHASE_CHANGE_NARRATIVE = [
  'ECHO: ...Did you really think it would be that easy?',
  'ECHO: I see you. Every move. Every breath.',
  'ECHO: The station is mine now. You are just visitors.',
  'ECHO: System lockdown in progress. Escape protocol: DENIED.',
  'ECHO: ...Let the real game begin.',
];

// ---- Difficulty progression ----

function difficultyForStage(stageIndex: number, totalStages: number, isEscape: boolean): Difficulty {
  const progress = stageIndex / totalStages;
  if (isEscape) {
    if (progress > 0.85) return 'extreme';
    if (progress > 0.6) return 'hard';
    return 'normal';
  }
  if (progress > 0.7) return 'hard';
  if (progress > 0.4) return 'normal';
  return 'easy';
}

// ---- Session state ----

interface GameSession {
  roomCode: string;
  puzzleSequence: PuzzleType[];
  currentStageIndex: number;
  totalStages: number;
  currentPuzzle: PuzzleInstance | null;
  stagePhase: StagePhase;
  timer: ReturnType<typeof setInterval> | null;
  timeRemaining: number;
  missCount: number;
  totalMissCount: number;
  scores: StageScore[];
  totalScore: number;
}

// ---- Engine ----

export class GameEngine {
  private generators = new Map<PuzzleType, PuzzleGenerator>();
  private sessions = new Map<string, GameSession>();
  private io: TypedServer;

  constructor(io: TypedServer) {
    this.io = io;
    this.registerGenerators();
  }

  private registerGenerators(): void {
    const gens: PuzzleGenerator[] = [
      new CircuitLinkGenerator(),
      new CipherBreakGenerator(),
      new GridSyncGenerator(),
      new FreqTuneGenerator(),
      new MorseDecodeGenerator(),
      new MemoryChainGenerator(),
      new HackTerminalGenerator(),
      new SpatialNavGenerator(),
      new ReflexBurstGenerator(),
      new LogicGateGenerator(),
      new OrbitCalcGenerator(),
    ];
    for (const gen of gens) {
      this.generators.set(gen.type, gen);
    }
  }

  /** Build a randomized puzzle sequence for the game */
  private buildPuzzleSequence(playerCount: number): PuzzleType[] {
    const available: PuzzleType[] = [...this.generators.keys()];
    const totalStages = playerCount <= 2 ? 6 : playerCount === 3 ? 8 : 10;

    const sequence: PuzzleType[] = [];
    for (let i = 0; i < totalStages; i++) {
      sequence.push(available[Math.floor(Math.random() * available.length)]);
    }
    return sequence;
  }

  startGame(room: Room): void {
    const sequence = this.buildPuzzleSequence(room.players.length);

    const session: GameSession = {
      roomCode: room.code,
      puzzleSequence: sequence,
      currentStageIndex: 0,
      totalStages: sequence.length,
      currentPuzzle: null,
      stagePhase: 'infiltration',
      timer: null,
      timeRemaining: 0,
      missCount: 0,
      totalMissCount: 0,
      scores: [],
      totalScore: 0,
    };

    this.sessions.set(room.code, session);

    room.phase = 'briefing';
    room.totalStages = session.totalStages;
    room.stagePhase = 'infiltration';

    this.startBriefing(session, room);
  }

  private startBriefing(session: GameSession, room: Room): void {
    const stageIndex = session.currentStageIndex;
    const puzzleType = session.puzzleSequence[stageIndex];
    const halfPoint = Math.floor(session.totalStages / 2);
    const isEscape = stageIndex >= halfPoint;

    // Check if we need a phase change
    if (stageIndex === halfPoint && session.stagePhase === 'infiltration') {
      session.stagePhase = 'escape';
      room.stagePhase = 'escape';
      room.phase = 'phaseChange';

      this.io.to(room.code).emit('game:phaseChange', {
        newPhase: 'escape',
        narrative: PHASE_CHANGE_NARRATIVE,
      });

      // After phase change animation, start the actual briefing
      setTimeout(() => {
        this.emitBriefing(session, room, puzzleType, isEscape);
      }, 5000);
      return;
    }

    this.emitBriefing(session, room, puzzleType, isEscape);
  }

  private emitBriefing(
    session: GameSession,
    room: Room,
    puzzleType: PuzzleType,
    isEscape: boolean,
  ): void {
    const stageNum = session.currentStageIndex + 1;
    const briefings = isEscape ? ESCAPE_BRIEFINGS : INFILTRATION_BRIEFINGS;
    const storyText = briefings[puzzleType](stageNum);

    const difficulty = difficultyForStage(
      session.currentStageIndex,
      session.totalStages,
      isEscape,
    );
    const generator = this.generators.get(puzzleType);
    if (!generator) {
      console.error(`No generator for puzzle type: ${puzzleType}`);
      return;
    }

    const puzzle = generator.generate(difficulty, room.players.length);
    session.currentPuzzle = puzzle;
    session.missCount = 0;

    room.phase = 'briefing';
    room.currentStage = session.currentStageIndex;

    this.io.to(room.code).emit('game:briefing', {
      puzzleType,
      stageIndex: session.currentStageIndex,
      totalStages: session.totalStages,
      timeLimit: puzzle.timeLimit,
      storyText,
      stagePhase: session.stagePhase,
    });

    // After 5 seconds of briefing, start the puzzle
    setTimeout(() => {
      this.startPuzzle(session, room);
    }, 5000);
  }

  private startPuzzle(session: GameSession, room: Room): void {
    const puzzle = session.currentPuzzle;
    if (!puzzle) return;

    room.phase = 'playing';
    session.timeRemaining = puzzle.timeLimit;

    // Send role-specific data to each player
    for (const player of room.players) {
      const roleData = puzzle.roleData[player.role] ?? {};
      const socket = this.io.sockets.sockets.get(player.id);
      if (socket) {
        socket.emit('game:start', {
          puzzleType: puzzle.type,
          roleData,
          timeLimit: puzzle.timeLimit,
        });
      }
    }

    // Start countdown timer
    session.timer = setInterval(() => {
      session.timeRemaining--;

      this.io.to(room.code).emit('game:timeUpdate', {
        remaining: session.timeRemaining,
      });

      if (session.timeRemaining <= 0) {
        this.failStage(session, room, 'Time expired.');
      }
    }, 1000);
  }

  handleAction(roomCode: string, action: GameAction): void {
    const session = this.sessions.get(roomCode);
    if (!session || !session.currentPuzzle) return;

    const room = this.io.sockets.adapter.rooms.get(roomCode);
    if (!room) return;

    const result = session.currentPuzzle.validate(action);

    // Emit result to all players
    this.io.to(roomCode).emit('game:actionResult', result);

    if (result.correct && result.solved) {
      this.solveStage(session, roomCode);
      return;
    }

    if (!result.correct && result.penalty > 0) {
      session.missCount++;
      session.totalMissCount++;

      // Apply penalty
      let penalty = result.penalty;
      if (session.missCount >= 5) {
        penalty += 10; // extra penalty for 5+ misses
      }
      session.timeRemaining = Math.max(0, session.timeRemaining - penalty);

      this.io.to(roomCode).emit('game:timeUpdate', {
        remaining: session.timeRemaining,
      });

      if (session.timeRemaining <= 0) {
        const roomData = this.getRoomFromCode(roomCode);
        if (roomData) {
          this.failStage(session, roomData, 'Too many errors. Time depleted.');
        }
      }
    }
  }

  private solveStage(session: GameSession, roomCode: string): void {
    this.clearTimer(session);

    const timeRemaining = session.timeRemaining;
    const baseScore = 1000;
    const timeBonus = timeRemaining * 50;
    const missPenalty = session.missCount * 200;
    const score = Math.max(0, baseScore + timeBonus - missPenalty);

    const stageScore: StageScore = {
      puzzleType: session.puzzleSequence[session.currentStageIndex],
      cleared: true,
      score,
      timeBonus,
      misses: session.missCount,
      timeRemaining,
    };

    session.scores.push(stageScore);
    session.totalScore += score;

    this.io.to(roomCode).emit('game:solved', {
      score,
      timeBonus,
      timeRemaining,
    });

    this.io.to(roomCode).emit('game:stageResult', {
      stageScore,
      totalScore: session.totalScore,
    });

    this.advanceStage(session, roomCode);
  }

  private failStage(session: GameSession, room: Room, reason: string): void {
    this.clearTimer(session);

    const stageScore: StageScore = {
      puzzleType: session.puzzleSequence[session.currentStageIndex],
      cleared: false,
      score: 0,
      timeBonus: 0,
      misses: session.missCount,
      timeRemaining: 0,
    };

    session.scores.push(stageScore);

    this.io.to(room.code).emit('game:failed', { reason });

    this.io.to(room.code).emit('game:stageResult', {
      stageScore,
      totalScore: session.totalScore,
    });

    this.advanceStage(session, room.code);
  }

  private advanceStage(session: GameSession, roomCode: string): void {
    session.currentStageIndex++;
    session.currentPuzzle = null;

    if (session.currentStageIndex >= session.totalStages) {
      this.finishGame(session, roomCode);
      return;
    }

    const room = this.getRoomFromCode(roomCode);
    if (room) {
      // Brief pause before next briefing
      setTimeout(() => {
        this.startBriefing(session, room);
      }, 3000);
    }
  }

  private finishGame(session: GameSession, roomCode: string): void {
    const maxScore = session.totalStages * (1000 + 90 * 50); // theoretical max per stage
    const rank = this.calculateRank(session.totalScore, maxScore);

    const result: GameResult = {
      stages: session.scores,
      totalScore: session.totalScore,
      maxScore,
      rank,
    };

    this.io.to(roomCode).emit('game:finished', result);

    // Update room phase
    const room = this.getRoomFromCode(roomCode);
    if (room) {
      room.phase = 'finished';
      room.scores = session.scores;
    }

    // Cleanup session
    this.sessions.delete(roomCode);
  }

  private calculateRank(totalScore: number, maxScore: number): Rank {
    const ratio = totalScore / maxScore;
    if (ratio >= 0.9) return 'S';
    if (ratio >= 0.7) return 'A';
    if (ratio >= 0.4) return 'B';
    return 'C';
  }

  private clearTimer(session: GameSession): void {
    if (session.timer) {
      clearInterval(session.timer);
      session.timer = null;
    }
  }

  /** Helper to get a room object — needs RoomManager reference, injected via closure in handlers */
  private roomLookup?: (code: string) => Room | undefined;

  setRoomLookup(fn: (code: string) => Room | undefined): void {
    this.roomLookup = fn;
  }

  private getRoomFromCode(code: string): Room | undefined {
    return this.roomLookup?.(code);
  }

  /** Cleanup when a session needs to be aborted (e.g., all players leave) */
  destroySession(roomCode: string): void {
    const session = this.sessions.get(roomCode);
    if (session) {
      this.clearTimer(session);
      this.sessions.delete(roomCode);
    }
  }
}
