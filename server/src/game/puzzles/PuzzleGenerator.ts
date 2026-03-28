// ===== STATIC ORBIT — Puzzle Generator Interface =====

import type { Difficulty, GameAction, PuzzleType, PuzzleRoleData, ValidationResult } from '../../../../shared/types.js';

export interface PuzzleInstance {
  type: PuzzleType;
  sharedData: Record<string, unknown>;
  roleData: PuzzleRoleData;
  timeLimit: number;
  validate(action: GameAction): ValidationResult;
  getHint?: (hintIndex: number) => string;
  getScanResult?: () => 'hot' | 'warm' | 'cold';
}

export interface PuzzleGenerator {
  type: PuzzleType;
  generate(difficulty: Difficulty, playerCount: number): PuzzleInstance;
}

/** Time limits per difficulty in seconds */
export const TIME_LIMITS: Record<Difficulty, number> = {
  easy: 60,
  normal: 55,
  hard: 45,
  extreme: 35,
};
