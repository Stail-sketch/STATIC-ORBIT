// ===== STATIC ORBIT — Core Breach Boss Puzzle Generator =====

import type { Difficulty, GameAction, PuzzleType, ValidationResult } from '../../../../shared/types.js';
import type { PuzzleGenerator, PuzzleInstance } from './PuzzleGenerator.js';

interface BreachProblem {
  index: number;
  type: 'math' | 'color' | 'symbol';
  question: string;
  answer: string;
}

const COLOR_MAP: Record<string, string> = {
  '赤': 'RED',
  '青': 'BLUE',
  '緑': 'GREEN',
  '黄': 'YELLOW',
  '白': 'WHITE',
  '紫': 'PURPLE',
  '橙': 'ORANGE',
  '黒': 'BLACK',
};

const SYMBOL_PAIRS: [string, string][] = [
  ['◆', 'DIAMOND'],
  ['★', 'STAR'],
  ['●', 'CIRCLE'],
  ['■', 'SQUARE'],
  ['▲', 'TRIANGLE'],
  ['♦', 'DIAMOND'],
  ['♠', 'SPADE'],
  ['♣', 'CLUB'],
];

function problemCountForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 10;
    case 'normal': return 14;
    case 'hard': return 18;
    case 'extreme': return 20;
  }
}

function thresholdForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 6;
    case 'normal': return 8;
    case 'hard': return 10;
    case 'extreme': return 12;
  }
}

function generateMathProblem(): { question: string; answer: string } {
  const ops = ['+', '-', '*'] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, result: number;

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 90) + 10;
      b = Math.floor(Math.random() * 90) + 10;
      result = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * 90) + 20;
      b = Math.floor(Math.random() * (a - 1)) + 1;
      result = a - b;
      break;
    case '*':
      a = Math.floor(Math.random() * 12) + 2;
      b = Math.floor(Math.random() * 12) + 2;
      result = a * b;
      break;
  }

  return { question: `${a} ${op} ${b} = ?`, answer: String(result!) };
}

function generateColorProblem(): { question: string; answer: string } {
  const colors = Object.keys(COLOR_MAP);
  const color = colors[Math.floor(Math.random() * colors.length)];
  return { question: `色コード変換: ${color}`, answer: COLOR_MAP[color] };
}

function generateSymbolProblem(): { question: string; answer: string } {
  const pair = SYMBOL_PAIRS[Math.floor(Math.random() * SYMBOL_PAIRS.length)];
  return { question: `記号識別: ${pair[0]}`, answer: pair[1] };
}

function generateProblems(count: number): BreachProblem[] {
  const problems: BreachProblem[] = [];
  const types: BreachProblem['type'][] = ['math', 'color', 'symbol'];

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    let q: { question: string; answer: string };

    switch (type) {
      case 'math': q = generateMathProblem(); break;
      case 'color': q = generateColorProblem(); break;
      case 'symbol': q = generateSymbolProblem(); break;
    }

    problems.push({ index: i, type, question: q.question, answer: q.answer });
  }

  return problems;
}

export class CoreBreachGenerator implements PuzzleGenerator {
  readonly type: PuzzleType = 'core-breach';

  generate(difficulty: Difficulty, _playerCount: number): PuzzleInstance {
    const totalProblems = problemCountForDifficulty(difficulty);
    const threshold = thresholdForDifficulty(difficulty);
    const problems = generateProblems(totalProblems);

    let correctCount = 0;
    const answeredProblems = new Set<number>();

    const instance: PuzzleInstance = {
      type: this.type,
      sharedData: {
        totalProblems,
        threshold,
      },
      roleData: {
        observer: {
          problems: problems.map(p => ({
            index: p.index,
            type: p.type,
            question: p.question,
            answer: p.answer,
          })),
          threshold,
          description: '全問題と解答が見えます。オペレーターに素早く解答を伝えてください。',
        },
        operator: {
          problems: problems.map(p => ({
            index: p.index,
            type: p.type,
            question: p.question,
          })),
          threshold,
          totalProblems,
          description: 'ファイアウォール突破中。問題が次々と表示されます。解答を入力してください。',
        },
        navigator: {
          problems: problems.map(p => ({
            index: p.index,
            type: p.type,
            question: p.question,
            answer: p.answer,
          })),
          threshold,
          description: '全解答が見えます。オブザーバーと手分けして指示を出してください。',
        },
        hacker: {
          problems: problems.filter((_, i) => i % 2 === 0).map(p => ({
            index: p.index,
            type: p.type,
            question: p.question,
            answer: p.answer,
          })),
          threshold,
          description: '奇数番目の問題の解答が見えます。残りはオブザーバーに確認してください。',
        },
      },
      timeLimit: 999,

      validate(action: GameAction): ValidationResult {
        if (action.action !== 'breach') {
          return { correct: false, penalty: 0, feedback: '不明なアクション。' };
        }

        const { problemIndex, answer } = action.data as { problemIndex: number; answer: string };

        if (problemIndex == null || problemIndex < 0 || problemIndex >= totalProblems) {
          return { correct: false, penalty: 0, feedback: '無効な問題番号。' };
        }

        if (answeredProblems.has(problemIndex)) {
          return { correct: false, penalty: 0, feedback: `問題${problemIndex + 1}は回答済みです。` };
        }

        const problem = problems[problemIndex];
        const normalizedAnswer = String(answer).trim().toUpperCase();
        const normalizedExpected = problem.answer.trim().toUpperCase();

        answeredProblems.add(problemIndex);

        if (normalizedAnswer === normalizedExpected) {
          correctCount++;
          const solved = correctCount >= threshold;
          return {
            correct: true,
            penalty: 0,
            feedback: `正解！ (${correctCount}/${threshold})`,
            solved,
          };
        }

        return {
          correct: false,
          penalty: 0,
          feedback: `不正解。次の問題へ。 (${correctCount}/${threshold})`,
        };
      },
    };

    return instance;
  }
}
