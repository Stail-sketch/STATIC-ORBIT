import { create } from 'zustand';
import type {
  Player,
  GamePhase,
  GameMode,
  StagePhase,
  PuzzleType,
  StageScore,
  GameResult,
  Role,
} from '@shared/types';

export type Screen = 'title' | 'lobby' | 'briefing' | 'playing' | 'phaseChange' | 'chapter' | 'result';

interface BriefingData {
  puzzleType: PuzzleType;
  stageIndex: number;
  totalStages: number;
  timeLimit: number;
  storyText: string;
  stagePhase: StagePhase;
  puzzleGuide?: string;
  gameMode?: GameMode;
  livesRemaining?: number;
  isBossSection?: boolean;
}

interface ChatMessage {
  playerName: string;
  message: string;
  timestamp: number;
}

interface GameState {
  // Connection
  screen: Screen;
  playerId: string | null;
  playerName: string;
  roomCode: string | null;

  // Room
  players: Player[];
  myRole: Role | null;
  isHost: boolean;
  gameMode: GameMode;

  // Game
  phase: GamePhase;
  stagePhase: StagePhase;
  currentPuzzleType: PuzzleType | null;
  roleData: Record<string, unknown> | null;
  timeLimit: number;
  timeRemaining: number;
  missCount: number;

  // Briefing
  briefing: BriefingData | null;

  // Chapter cutscene
  chapterData: { chapterNumber: number; title: string; subtitle: string; lines: string[] } | null;

  // Phase change
  phaseNarrative: string[];

  // Scores
  stageScores: StageScore[];
  totalScore: number;
  gameResult: GameResult | null;

  // Chat
  chatMessages: ChatMessage[];

  // Last action feedback
  lastFeedback: { correct: boolean; feedback?: string } | null;

  // Ready check
  readyPlayers: string[];
  isReady: boolean;
  countdown: number | null;

  // Lives (story mode)
  livesRemaining: number;

  // Navigator hints
  hints: string[];
  hintsRemaining: number;

  // Hacker ECHO attack
  echoAttack: { attackType: string; defenseCode: string; duration: number } | null;
  attackLog: { attackType: string; defended: boolean; timestamp: number }[];

  // Hacker scan
  scanResults: { result: string; scansRemaining: number; timestamp: number }[];
  scansRemaining: number;

  // Actions
  setChapterData: (data: { chapterNumber: number; title: string; subtitle: string; lines: string[] }) => void;
  setScreen: (screen: Screen) => void;
  setPlayerId: (id: string) => void;
  setPlayerName: (name: string) => void;
  setRoomCode: (code: string) => void;
  setGameMode: (mode: GameMode) => void;
  setPlayers: (players: Player[]) => void;
  setBriefing: (data: BriefingData) => void;
  startPuzzle: (data: { puzzleType: PuzzleType; roleData: Record<string, unknown>; timeLimit: number }) => void;
  setTimeRemaining: (t: number) => void;
  setActionResult: (result: { correct: boolean; penalty: number; feedback?: string }) => void;
  setSolved: (data: { score: number; timeBonus: number; timeRemaining: number }) => void;
  setFailed: (reason: string) => void;
  setStageResult: (data: { stageScore: StageScore; totalScore: number }) => void;
  setPhaseChange: (data: { newPhase: StagePhase; narrative: string[] }) => void;
  setGameFinished: (result: GameResult) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setReadyPlayers: (players: string[], total: number) => void;
  setMyReady: () => void;
  setCountdown: (count: number | null) => void;
  setLivesRemaining: (lives: number) => void;
  addHint: (hint: string, hintsRemaining: number) => void;
  setEchoAttack: (attack: { attackType: string; defenseCode: string; duration: number } | null) => void;
  addAttackLog: (entry: { attackType: string; defended: boolean }) => void;
  addScanResult: (result: { result: string; scansRemaining: number }) => void;
  setAttackEffect: (effect: string) => void;
  reset: () => void;
}

const initialState = {
  screen: 'title' as Screen,
  playerId: null as string | null,
  playerName: '',
  roomCode: null as string | null,
  players: [] as Player[],
  myRole: null as Role | null,
  isHost: false,
  gameMode: 'story' as GameMode,
  phase: 'lobby' as GamePhase,
  stagePhase: 'infiltration' as StagePhase,
  currentPuzzleType: null as PuzzleType | null,
  roleData: null as Record<string, unknown> | null,
  timeLimit: 90,
  timeRemaining: 90,
  missCount: 0,
  briefing: null as BriefingData | null,
  chapterData: null as { chapterNumber: number; title: string; subtitle: string; lines: string[] } | null,
  phaseNarrative: [] as string[],
  stageScores: [] as StageScore[],
  totalScore: 0,
  gameResult: null as GameResult | null,
  chatMessages: [] as ChatMessage[],
  lastFeedback: null as { correct: boolean; feedback?: string } | null,
  readyPlayers: [] as string[],
  isReady: false,
  countdown: null as number | null,
  livesRemaining: 3,
  hints: [] as string[],
  hintsRemaining: 3,
  echoAttack: null as { attackType: string; defenseCode: string; duration: number } | null,
  attackLog: [] as { attackType: string; defended: boolean; timestamp: number }[],
  scanResults: [] as { result: string; scansRemaining: number; timestamp: number }[],
  scansRemaining: 3,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  setChapterData: (data) => set({ chapterData: data, screen: 'chapter' }),
  setScreen: (screen) => set({ screen }),
  setPlayerId: (id) => set({ playerId: id }),
  setPlayerName: (name) => set({ playerName: name }),
  setRoomCode: (code) => set({ roomCode: code }),
  setGameMode: (mode) => set({ gameMode: mode }),

  setPlayers: (players) => {
    const myId = get().playerId;
    const me = players.find((p) => p.id === myId);
    set({
      players,
      myRole: me?.role ?? null,
      isHost: me?.isHost ?? false,
    });
  },

  setBriefing: (data) =>
    set({
      briefing: data,
      screen: 'briefing',
      stagePhase: data.stagePhase,
      missCount: 0,
      lastFeedback: null,
      readyPlayers: [],
      isReady: false,
      countdown: null,
      ...(data.gameMode ? { gameMode: data.gameMode } : {}),
      ...(data.livesRemaining !== undefined ? { livesRemaining: data.livesRemaining } : {}),
    }),

  startPuzzle: (data) =>
    set({
      screen: 'playing',
      currentPuzzleType: data.puzzleType,
      roleData: data.roleData,
      timeLimit: data.timeLimit,
      timeRemaining: data.timeLimit,
      lastFeedback: null,
      hints: [],
      hintsRemaining: 3,
      echoAttack: null,
      attackLog: [],
      scanResults: [],
      scansRemaining: 3,
    }),

  setTimeRemaining: (t) => set({ timeRemaining: t }),

  setActionResult: (result) =>
    set((s) => ({
      missCount: result.correct ? s.missCount : s.missCount + 1,
      lastFeedback: { correct: result.correct, feedback: result.feedback },
    })),

  setSolved: (_data) => set({ lastFeedback: { correct: true, feedback: '解除成功！' } }),

  setFailed: (_reason) => set({ lastFeedback: { correct: false, feedback: '時間切れ' } }),

  setStageResult: (data) =>
    set((s) => ({
      stageScores: [...s.stageScores, data.stageScore],
      totalScore: data.totalScore,
    })),

  setPhaseChange: (data) =>
    set({
      screen: 'phaseChange',
      stagePhase: data.newPhase,
      phaseNarrative: data.narrative,
    }),

  setGameFinished: (result) =>
    set({
      screen: 'result',
      gameResult: result,
      ...(result.gameMode ? { gameMode: result.gameMode } : {}),
    }),

  addChatMessage: (msg) =>
    set((s) => ({
      chatMessages: [...s.chatMessages.slice(-50), msg],
    })),

  setReadyPlayers: (players, _total) =>
    set({ readyPlayers: players }),

  setMyReady: () =>
    set({ isReady: true }),

  setCountdown: (count) =>
    set({ countdown: count }),

  setLivesRemaining: (lives) =>
    set({ livesRemaining: lives }),

  addHint: (hint, hintsRemaining) =>
    set((s) => ({
      hints: [...s.hints, hint],
      hintsRemaining,
    })),

  setEchoAttack: (attack) =>
    set({ echoAttack: attack }),

  addAttackLog: (entry) =>
    set((s) => ({
      attackLog: [...s.attackLog.slice(-10), { ...entry, timestamp: Date.now() }],
      echoAttack: null,
    })),

  addScanResult: (result) =>
    set((s) => ({
      scanResults: [...s.scanResults.slice(-5), { ...result, timestamp: Date.now() }],
      scansRemaining: result.scansRemaining,
    })),

  setAttackEffect: (_effect) =>
    set({ echoAttack: null }),

  reset: () => set({ ...initialState }),
}));
