// ===== STATIC ORBIT — Shared Types =====

export type GameMode = 'story' | 'endless';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'extreme';

export type Role = 'observer' | 'operator' | 'navigator' | 'hacker';

export type GamePhase = 'lobby' | 'briefing' | 'playing' | 'result' | 'phaseChange' | 'finished';

export type StagePhase = 'infiltration' | 'escape';

export type PuzzleType =
  | 'circuit-link'
  | 'cipher-break'
  | 'grid-sync'
  | 'freq-tune'
  | 'morse-decode'
  | 'memory-chain'
  | 'hack-terminal'
  | 'spatial-nav'
  | 'reflex-burst'
  | 'logic-gate'
  | 'orbit-calc';

export interface Player {
  id: string;
  name: string;
  role: Role;
  ready: boolean;
  isHost: boolean;
}

export interface Room {
  code: string;
  players: Player[];
  phase: GamePhase;
  stagePhase: StagePhase;
  currentStage: number;
  totalStages: number;
  scores: StageScore[];
  gameMode: GameMode;
}

export interface StageScore {
  puzzleType: PuzzleType;
  cleared: boolean;
  score: number;
  timeBonus: number;
  misses: number;
  timeRemaining: number;
}

export interface PuzzleRoleData {
  observer: Record<string, unknown>;
  operator: Record<string, unknown>;
  navigator?: Record<string, unknown>;
  hacker?: Record<string, unknown>;
}

export interface GameAction {
  puzzleId: string;
  action: string;
  data: Record<string, unknown>;
}

export interface ValidationResult {
  correct: boolean;
  penalty: number;
  feedback?: string;
  solved?: boolean;
}

export type Rank = 'S' | 'A' | 'B' | 'C';

export interface GameResult {
  stages: StageScore[];
  totalScore: number;
  maxScore: number;
  rank: Rank;
  gameMode: GameMode;
  wavesReached?: number;
  storyEnding?: string[];
}

// ===== Socket Events =====

export interface ClientToServerEvents {
  'room:create': (data: { playerName: string; gameMode: GameMode }) => void;
  'room:join': (data: { roomCode: string; playerName: string }) => void;
  'room:ready': (data: { playerId: string }) => void;
  'room:start': (data: { roomCode: string }) => void;
  'game:action': (data: GameAction) => void;
  'game:chat': (data: { message: string }) => void;
}

export interface ServerToClientEvents {
  'room:created': (data: { roomCode: string; playerId: string; gameMode: GameMode }) => void;
  'room:joined': (data: { playerId: string; players: Player[]; gameMode: GameMode }) => void;
  'room:updated': (data: { players: Player[]; phase: GamePhase; gameMode: GameMode }) => void;
  'room:error': (data: { message: string }) => void;
  'game:briefing': (data: {
    puzzleType: PuzzleType;
    stageIndex: number;
    totalStages: number;
    timeLimit: number;
    storyText: string;
    stagePhase: StagePhase;
    puzzleGuide?: string;
    gameMode: GameMode;
  }) => void;
  'game:start': (data: { puzzleType: PuzzleType; roleData: Record<string, unknown>; timeLimit: number }) => void;
  'game:timeUpdate': (data: { remaining: number }) => void;
  'game:actionResult': (data: ValidationResult) => void;
  'game:solved': (data: { score: number; timeBonus: number; timeRemaining: number }) => void;
  'game:failed': (data: { reason: string }) => void;
  'game:stageResult': (data: { stageScore: StageScore; totalScore: number }) => void;
  'game:phaseChange': (data: { newPhase: StagePhase; narrative: string[] }) => void;
  'game:finished': (data: GameResult) => void;
  'game:chat': (data: { playerName: string; message: string }) => void;
}
