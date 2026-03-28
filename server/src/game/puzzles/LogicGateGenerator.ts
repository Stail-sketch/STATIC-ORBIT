// ===== STATIC ORBIT — Logic Gate Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';
import { TIME_LIMITS } from './PuzzleGenerator.js';

const ALL_COLORS = ['red', 'blue', 'green', 'yellow'] as const;

const COLOR_JP: Record<string, string> = {
  red: '赤',
  blue: '青',
  green: '緑',
  yellow: '黄',
};

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

/** Brute-force verify that a set of clues has exactly one valid solution */
function verifySingleSolution(
  clues: Array<{ type: string; data: Record<string, string> }>,
  names: string[],
  colors: string[],
): Record<string, string> | null {
  // Generate all possible assignments
  const solutions: Record<string, string>[] = [];

  function enumerate(index: number, current: Record<string, string>) {
    if (index === names.length) {
      // Check all clues against this assignment
      if (allCluesSatisfied(clues, current)) {
        solutions.push({ ...current });
      }
      return;
    }
    for (const color of colors) {
      current[names[index]] = color;
      enumerate(index + 1, current);
    }
    delete current[names[index]];
  }

  enumerate(0, {});

  if (solutions.length === 1) {
    return solutions[0];
  }
  return null; // not uniquely solvable
}

function allCluesSatisfied(
  clues: Array<{ type: string; data: Record<string, string> }>,
  assignment: Record<string, string>,
): boolean {
  for (const clue of clues) {
    switch (clue.type) {
      case 'direct':
        if (assignment[clue.data.name] !== clue.data.color) return false;
        break;
      case 'negation':
        if (assignment[clue.data.name] === clue.data.color) return false;
        break;
      case 'different':
        if (assignment[clue.data.nameA] === assignment[clue.data.nameB]) return false;
        break;
      case 'conditional':
        // "If A is X then B is Y" — only false when A is X and B is not Y
        if (assignment[clue.data.nameA] === clue.data.colorA &&
            assignment[clue.data.nameB] !== clue.data.colorB) return false;
        break;
    }
  }
  return true;
}

/** Convert structured clue to Japanese text */
function clueToJapanese(clue: { type: string; data: Record<string, string> }): string {
  switch (clue.type) {
    case 'direct':
      return `${clue.data.name}は${COLOR_JP[clue.data.color]}`;
    case 'negation':
      return `${clue.data.name}は${COLOR_JP[clue.data.color]}ではない`;
    case 'different':
      return `${clue.data.nameA}と${clue.data.nameB}は異なる色`;
    case 'conditional':
      return `${clue.data.nameA}が${COLOR_JP[clue.data.colorA]}ならば、${clue.data.nameB}は${COLOR_JP[clue.data.colorB]}`;
    default:
      return '';
  }
}

/** Generate clues that DETERMINISTICALLY solve the puzzle */
function generateClues(
  solution: Record<string, string>,
  names: string[],
  colors: string[],
  difficulty: Difficulty,
): { clues: Array<{ type: string; data: Record<string, string> }>; texts: string[] } {
  const maxAttempts = 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const clues: Array<{ type: string; data: Record<string, string> }> = [];
    const shuffledNames = shuffle([...names]);

    if (difficulty === 'easy') {
      // Easy: direct clues for all but 1 element; that element gets negation clues narrowing to 1
      const directNames = shuffledNames.slice(0, shuffledNames.length - 1);
      const deductionName = shuffledNames[shuffledNames.length - 1];

      for (const name of directNames) {
        clues.push({ type: 'direct', data: { name, color: solution[name] } });
      }

      // For the last element, add negation clues for all wrong colors
      const wrongColors = colors.filter(c => c !== solution[deductionName]);
      for (const wc of wrongColors) {
        clues.push({ type: 'negation', data: { name: deductionName, color: wc } });
      }
    } else if (difficulty === 'normal') {
      // Normal: ~half direct, half elimination (negations that narrow to exactly 1)
      const directCount = Math.ceil(shuffledNames.length / 2);
      const directNames = shuffledNames.slice(0, directCount);
      const eliminationNames = shuffledNames.slice(directCount);

      for (const name of directNames) {
        clues.push({ type: 'direct', data: { name, color: solution[name] } });
      }

      for (const name of eliminationNames) {
        const wrongColors = colors.filter(c => c !== solution[name]);
        for (const wc of wrongColors) {
          clues.push({ type: 'negation', data: { name, color: wc } });
        }
      }
    } else if (difficulty === 'hard') {
      // Hard: some direct, some elimination, some "different" relationship clues
      // Give direct clues for ~2 elements
      const directCount = Math.min(2, shuffledNames.length);
      const directNames = shuffledNames.slice(0, directCount);
      const remaining = shuffledNames.slice(directCount);

      for (const name of directNames) {
        clues.push({ type: 'direct', data: { name, color: solution[name] } });
      }

      // For remaining, use a mix of negation and "different" clues
      for (const name of remaining) {
        const wrongColors = shuffle(colors.filter(c => c !== solution[name]));
        // Add enough negation to narrow to 1-2 options
        for (let i = 0; i < wrongColors.length - 1; i++) {
          clues.push({ type: 'negation', data: { name, color: wrongColors[i] } });
        }
        // Add a "different" clue with a direct-clued node to pin down the last option
        const knownNode = pickRandom(directNames);
        if (solution[name] !== solution[knownNode]) {
          clues.push({ type: 'different', data: { nameA: name, nameB: knownNode } });
        } else {
          // Same color, add the final negation instead
          clues.push({ type: 'negation', data: { name, color: wrongColors[wrongColors.length - 1] } });
        }
      }
    } else {
      // Extreme: all indirect — negations, different, and conditionals
      // Strategy: use conditional and different clues, plus negation chains
      // Give NO direct clues. Use pairs and elimination.

      // Pick one "anchor" element: give all-but-one negation (narrows to 1 color)
      const anchor = shuffledNames[0];
      const anchorWrong = colors.filter(c => c !== solution[anchor]);
      for (const wc of anchorWrong) {
        clues.push({ type: 'negation', data: { name: anchor, color: wc } });
      }

      // For each other element, link to anchor or other resolved elements via conditional/different
      for (let i = 1; i < shuffledNames.length; i++) {
        const name = shuffledNames[i];

        if (solution[name] !== solution[anchor]) {
          clues.push({ type: 'different', data: { nameA: name, nameB: anchor } });
        }

        // Add conditional: "if anchor is [its color], then name is [its color]"
        clues.push({
          type: 'conditional',
          data: { nameA: anchor, colorA: solution[anchor], nameB: name, colorB: solution[name] },
        });

        // Add extra negation for one wrong color
        const wrongColors = colors.filter(c => c !== solution[name]);
        if (wrongColors.length > 0) {
          clues.push({ type: 'negation', data: { name, color: pickRandom(wrongColors) } });
        }
      }
    }

    // Verify unique solution
    const verified = verifySingleSolution(clues, names, colors);
    if (verified) {
      // Shuffle clue order and convert to text
      const shuffledClues = shuffle(clues);
      const texts = shuffledClues.map(clueToJapanese);
      return { clues: shuffledClues, texts };
    }
  }

  // Fallback: if we somehow can't generate valid clues, give direct clues for everything
  const fallbackClues: Array<{ type: string; data: Record<string, string> }> = [];
  for (const name of names) {
    fallbackClues.push({ type: 'direct', data: { name, color: solution[name] } });
  }
  const texts = fallbackClues.map(clueToJapanese);
  return { clues: fallbackClues, texts };
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

    // Generate deterministically solvable clues with verification
    const { texts: clueTexts } = generateClues(solution, elementNames, availableColors, difficulty);

    const timeLimit = TIME_LIMITS[difficulty];

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: { elementCount: numElements },
      roleData: {
        observer: {
          clues: clueTexts,
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
          return { correct: false, penalty: 0, feedback: '不明なアクション。' };
        }

        const { assignments } = action.data as { assignments: Record<string, string> };

        if (!assignments || typeof assignments !== 'object') {
          return { correct: false, penalty: 0, feedback: '割り当てが未入力。' };
        }

        // Check all assignments
        let allCorrect = true;
        const errors: string[] = [];

        for (const name of elementNames) {
          if (!assignments[name]) {
            allCorrect = false;
            errors.push(`${name}が未割当。`);
          } else if (assignments[name] !== solution[name]) {
            allCorrect = false;
            errors.push(`${name}が不正解。`);
          }
        }

        if (allCorrect) {
          return {
            correct: true,
            penalty: 0,
            feedback: '全割当正解。ロジックマトリクス解除。',
            solved: true,
          };
        }

        return {
          correct: false,
          penalty: 15,
          feedback: `不正解: ${errors.join(' ')}`,
        };
      },
    };

    return instance;
  }
}
