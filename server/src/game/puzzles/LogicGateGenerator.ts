// ===== STATIC ORBIT — Logic Gate Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';
import { TIME_LIMITS } from './PuzzleGenerator.js';

const ALL_COLORS = ['red', 'blue', 'green', 'yellow'] as const;

function elementCount(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 3;
    case 'normal': return 4;
    case 'hard': return 5;
    case 'extreme': return 6;
  }
}

function colorCount(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 3;
    case 'normal': return 3;
    case 'hard': return 4;
    case 'extreme': return 4;
  }
}

function clueCount(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 4;
    case 'normal': return 6;
    case 'hard': return 8;
    case 'extreme': return 10;
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

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generate clues that are consistent with the solution */
function generateClues(
  solution: Record<string, string>,
  names: string[],
  colors: string[],
  difficulty: Difficulty,
): string[] {
  const clues: string[] = [];
  const target = clueCount(difficulty);

  // Always include enough direct / negation clues to make puzzle solvable
  // Phase 1: Direct assignment clues (some)
  const shuffledNames = shuffle([...names]);

  // For easy/normal: mostly direct clues
  // For hard/extreme: mix in conditionals and negation
  const directCount = difficulty === 'easy' ? 2 : difficulty === 'normal' ? 2 : 1;

  for (let i = 0; i < Math.min(directCount, shuffledNames.length); i++) {
    const name = shuffledNames[i];
    clues.push(`${name} is ${solution[name]}.`);
  }

  // Phase 2: Negation clues
  for (const name of shuffledNames) {
    if (clues.length >= target) break;
    const wrongColors = colors.filter(c => c !== solution[name]);
    if (wrongColors.length > 0) {
      const wrongColor = pickRandom(wrongColors);
      const clue = `${name} is not ${wrongColor}.`;
      if (!clues.includes(clue)) {
        clues.push(clue);
      }
    }
  }

  // Phase 3: "different colors" clues
  if (difficulty !== 'easy') {
    for (let i = 0; i < names.length && clues.length < target; i++) {
      for (let j = i + 1; j < names.length && clues.length < target; j++) {
        if (solution[names[i]] !== solution[names[j]]) {
          clues.push(`${names[i]} and ${names[j]} are different colors.`);
        }
      }
    }
  }

  // Phase 4: Conditional clues (hard+)
  if (difficulty === 'hard' || difficulty === 'extreme') {
    for (let i = 0; i < names.length && clues.length < target; i++) {
      for (let j = 0; j < names.length && clues.length < target; j++) {
        if (i === j) continue;
        const nameA = names[i];
        const nameB = names[j];
        // True conditional: "If A is [its color] then B is [its color]" — always true
        clues.push(
          `If ${nameA} is ${solution[nameA]} then ${nameB} is ${solution[nameB]}.`,
        );
      }
    }
  }

  // Phase 5: Double negation (extreme)
  if (difficulty === 'extreme') {
    for (const name of shuffledNames) {
      if (clues.length >= target) break;
      // "It is not the case that X is not [correct color]" => X is [correct color]
      clues.push(`It is not the case that ${name} is not ${solution[name]}.`);
    }
  }

  // Trim to target and shuffle
  return shuffle(clues.slice(0, target));
}

export class LogicGateGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'logic-gate';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const numElements = elementCount(difficulty);
    const numColors = colorCount(difficulty);
    const availableColors = [...ALL_COLORS].slice(0, numColors);
    const elementNames = Array.from({ length: numElements }, (_, i) =>
      `Node-${String.fromCharCode(65 + i)}`,
    );

    // Generate a random valid assignment
    const solution: Record<string, string> = {};
    for (const name of elementNames) {
      solution[name] = pickRandom(availableColors);
    }

    // Generate clues
    const clues = generateClues(solution, elementNames, availableColors, difficulty);

    const timeLimit = TIME_LIMITS[difficulty];

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { elementCount: numElements },
      roleData: {
        observer: {
          clues,
          elementNames: [...elementNames],
          availableColors: [...availableColors],
        },
        operator: {
          elementNames: [...elementNames],
          availableColors: [...availableColors],
        },
      },
      timeLimit,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'assign') {
          return { correct: false, penalty: 0, feedback: 'Unknown action.' };
        }

        const { assignments } = action.data as { assignments: Record<string, string> };

        if (!assignments || typeof assignments !== 'object') {
          return { correct: false, penalty: 0, feedback: 'Missing assignments.' };
        }

        // Check all assignments
        let allCorrect = true;
        const errors: string[] = [];

        for (const name of elementNames) {
          if (!assignments[name]) {
            allCorrect = false;
            errors.push(`${name} not assigned.`);
          } else if (assignments[name] !== solution[name]) {
            allCorrect = false;
            errors.push(`${name} is incorrect.`);
          }
        }

        if (allCorrect) {
          return {
            correct: true,
            penalty: 0,
            feedback: 'All assignments correct. Logic matrix solved.',
            solved: true,
          };
        }

        return {
          correct: false,
          penalty: 15,
          feedback: `Incorrect: ${errors.join(' ')}`,
        };
      },
    };

    return instance;
  }
}
