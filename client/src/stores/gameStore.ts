import { create } from 'zustand';
import type {
  Player,
  GamePhase,
  StagePhase,
  PuzzleType,
  StageScore,
  GameResult,
  Role,
} from '@shared/types';

export type Screen = 'title' | 'lobby' | 'briefing' | 'playing' | 'phaseChange' | 'result';

interface BriefingData {
  puzzleType: PuzzleType;
  stageIndex: number;
  totalStages: number;
  timeLimit: number;
  storyText: string;
  stagePhase: StagePhase;
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

  // Actions
  setScreen: (screen: Screen) => void;
  setPlayerId: (id: string) => void;
  setPlayerName: (name: string) => void;
  setRoomCode: (code: string) => void;
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
  phase: 'lobby' as GamePhase,
  stagePhase: 'infiltration' as StagePhase,
  currentPuzzleType: null as PuzzleType | null,
  roleData: null as Record<string, unknown> | null,
  timeLimit: 90,
  timeRemaining: 90,
  missCount: 0,
  briefing: null as BriefingData | null,
  phaseNarrative: [] as string[],
  stageScores: [] as StageScore[],
  totalScore: 0,
  gameResult: null as GameResult | null,
  chatMessages: [] as ChatMessage[],
  lastFeedback: null as { correct: boolean; feedback?: string } | null,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  setScreen: (screen) => set({ screen }),
  setPlayerId: (id) => set({ playerId: id }),
  setPlayerName: (name) => set({ playerName: name }),
  setRoomCode: (code) => set({ roomCode: code }),

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
    }),

  startPuzzle: (data) =>
    set({
      screen: 'playing',
      currentPuzzleType: data.puzzleType,
      roleData: data.roleData,
      timeLimit: data.timeLimit,
      timeRemaining: data.timeLimit,
      lastFeedback: null,
    }),

  setTimeRemaining: (t) => set({ timeRemaining: t }),

  setActionResult: (result) =>
    set((s) => ({
      missCount: result.correct ? s.missCount : s.missCount + 1,
      lastFeedback: { correct: result.correct, feedback: result.feedback },
    })),

  setSolved: (_data) => set({ lastFeedback: { correct: true, feedback: 'SOLVED' } }),

  setFailed: (_reason) => set({ lastFeedback: { correct: false, feedback: 'TIME UP' } }),

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
    }),

  addChatMessage: (msg) =>
    set((s) => ({
      chatMessages: [...s.chatMessages.slice(-50), msg],
    })),

  reset: () => set({ ...initialState }),
}));
