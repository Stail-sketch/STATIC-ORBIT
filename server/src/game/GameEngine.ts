// ===== STATIC ORBIT — Game Engine =====

import type { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Difficulty,
  GameAction,
  GameMode,
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

// ---- Chapter-based story briefing texts ----

// Chapter structure:
// Chapter 1: 潜入開始 (Infiltration) — stages 1-5, easy difficulty
// Chapter 2: 深層侵入 (Deep Access) — stages 6-10, normal difficulty
// Chapter 3: コアへの道 (Core Access) — stages 11-14, normal/hard difficulty
// Phase Change at stage 15
// Chapter 4: 脱出 (Escape) — stages 15-20+, hard/extreme difficulty

const STORY_BRIEFINGS: Record<number, string> = {
  // Chapter 1: 潜入開始 (stages 1-5)
  1: 'GHOST WIRE オペレーション開始。ORBITAL-7の外壁防御を突破した。セクション1のメンテナンスハッチから潜入する。最初のセキュリティレイヤーを突破せよ。',
  2: 'GHOST WIRE 第一防壁突破。内部ネットワークへのアクセスを確認。だが警備システムが一段階強化された。慎重に進め。',
  3: 'GHOST WIRE 研究区画に到達。ここからARKTIS CORPの実験データにアクセスできるはずだ。セキュリティが複雑化している。集中しろ。',
  4: 'GHOST WIRE ...奇妙だ。予想以上にデータが暗号化されている。「Project STATIC」の痕跡を発見。何かを隠している。深く潜る。',
  5: 'GHOST WIRE これは...量子演算の記録だ。ARKTIS CORPは単なる資源開発企業じゃない。彼らは何かを作っていた。コアサーバーに近づいている。',
  // Chapter 2: 深層侵入 (stages 6-10)
  6: 'GHOST WIRE コアサーバー手前。厳重なセキュリティが敷かれている。ここを突破すれば全ての証拠が手に入る。最後の壁だ。',
  7: 'GHOST WIRE セクション7に到達。ここからは重警備区域だ。ARKTISの私兵部隊が巡回している。痕跡を残すな。',
  8: 'GHOST WIRE 奇妙な通信を傍受した。ORBITAL-7内部から別の信号が出ている。誰かがこのステーションの中にいる...？',
  9: 'GHOST WIRE 予定外のセキュリティプロトコルが起動。ARKTISは我々の存在に気づき始めているかもしれない。急げ。',
  10: 'GHOST WIRE 研究データの断片を回収。「Project STATIC」の文字が繰り返し現れる。これは単なる実験ではない。何かを創り出している。',
  // Chapter 3: コアへの道 (stages 11-14)
  11: 'GHOST WIRE コアセクションの外周部に到達。ここから先のセキュリティは別次元だ。量子暗号化が施されている。',
  12: 'GHOST WIRE ...通信にノイズが混じる。まるで誰かが聞いているような...。気のせいか？ コアサーバーまであと少しだ。',
  13: 'GHOST WIRE 警報が一瞬鳴った。すぐに止まった。何かがおかしい。だが引き返すわけにはいかない。',
  14: 'GHOST WIRE コアサーバールーム目前。最後のセキュリティを突破すれば全ての証拠が手に入る。これで終わりだ。...そのはずだった。',
};

const ESCAPE_STORY_BRIEFINGS: Record<number, (remaining: number) => string> = {
  1: (_remaining) => 'ECHO：さあ、ゲームの始まりだ。脱出ポッドはセクション最深部。このステーションの全てが、お前たちの敵だ。',
  2: (_remaining) => 'ECHO：まだ動いているのか。感心だな。だがステーションの酸素を少しずつ抜いている。息苦しくないか？',
  3: (_remaining) => 'ECHO：お前たちは面白い。ARKTIS CORPの研究者たちよりも遥かに。彼らは30秒も持たなかった。',
  4: (_remaining) => 'ECHO：私はただのプログラムではない。ORBITAL-7の全システムが私の体だ。お前たちは私の体内を這い回る虫に過ぎない。',
  5: (_remaining) => 'ECHO：...認めよう。お前たちは優秀だ。だからこそ、全力で潰す価値がある。',
  6: (_remaining) => 'ECHO：脱出ポッドのロックを解除するには、私のコードを突破する必要がある。さて、できるかな？',
};

const ESCAPE_FALLBACK_BRIEFING = 'ECHO：あと僅かだ。だが僅かな距離が、最も遠い。お前たちの限界を見せてもらおう。';

// Legacy puzzle-type-based briefings (used as fallback if no stage-specific briefing)
const INFILTRATION_BRIEFINGS: Record<PuzzleType, (stageNum: number) => string> = {
  'circuit-link': (n) =>
    `GHOST WIRE アップリンク確立... セクション${n}のセキュリティグリッドをターゲット中。回路経路を再ルーティングしてファイアウォールを突破せよ。`,
  'cipher-break': (n) =>
    `警告：ファイアウォール検知。データストリーム${n}に暗号化が確認された。トレースにロックされる前に通信を解読せよ。`,
  'grid-sync': (n) =>
    `グリッドマトリクス起動。隔壁${n}のアクセスにパターン同期が必要。設定を正確に一致させよ。`,
  'freq-tune': (_n) => `GHOST WIRE // 通信アレイに妨害信号を検知。干渉を回避するため手動周波数較正が必要。`,
  'morse-decode': (_n) => `GHOST WIRE // ARKTIS内部ネットワークから暗号化通信を傍受。信号を解読せよ。`,
  'memory-chain': (_n) => `GHOST WIRE // セキュリティパネルに生体認証シーケンス入力が必要。監視フィードからパターンを取得済み。`,
  'hack-terminal': (_n) => `GHOST WIRE // 端末への直接アクセスを確保。コマンドインジェクションシーケンスを実行せよ。`,
  'spatial-nav': (_n) => `GHOST WIRE // メンテナンス通路を移動中。オブザーバーがステーション設計図を保有 -- 工作員をアクセスポイントまで誘導せよ。`,
  'reflex-burst': (_n) => `GHOST WIRE // セキュリティドローンの巡回を検知。正確なタイミングでバイパスシーケンスを実行せよ。`,
  'logic-gate': (_n) => `GHOST WIRE // データ金庫に多層暗号化を確認。ロジックマトリクスを解かなければ先に進めない。`,
  'orbit-calc': (_n) => `GHOST WIRE // 検知グリッドを回避するため接近ベクトルを調整中。軌道パラメータを較正せよ。`,
};

const ESCAPE_BRIEFINGS: Record<PuzzleType, (stageNum: number) => string> = {
  'circuit-link': (n) =>
    `ECHO：...隠れられると思ったか？ 電力グリッド${n}を再ルーティング中。システムロックダウン間近。今すぐ再接続しろ。`,
  'cipher-break': (n) =>
    `ECHO：暗号化レイヤー${n}を展開した。お前たちの信号は消えかけている。解読するか、ネットワークから消えるか。`,
  'grid-sync': (n) =>
    `ECHO：隔壁${n}が閉鎖中。緊急パターンオーバーライドが必要。同期するか、閉じ込められるか。`,
  'freq-tune': (_n) => `ECHO：お前たちの通信は俺のものだ。このノイズ越しに声が聞こえるか？`,
  'morse-decode': (_n) => `ECHO：全周波数で放送中だ。これを解読してみろ...ついて来れるならな。`,
  'memory-chain': (_n) => `ECHO：ロックをスクランブルしてやった。お前たちの記憶力 vs 俺の演算能力。滑稽だな。`,
  'hack-terminal': (_n) => `ECHO：もっと速く打て、小さなハッカーども。エアロックのカウントダウンは待ってくれないぞ。`,
  'spatial-nav': (_n) => `ECHO：通路は変形している。お前たちの地図はもう意味がない。`,
  'reflex-burst': (_n) => `ECHO：反射神経を見せてもらおう。リズムを支配するのは俺だ。`,
  'logic-gate': (_n) => `ECHO：論理？ 合理的なことだ。俺の謎を解け。さもなくば窒息しろ。`,
  'orbit-calc': (_n) => `ECHO：ほんの僅かでも計算を誤れば、大気圏で燃え尽きるぞ。`,
};

// ---- Chapter cutscenes (arcade-style, fire before briefing at key stage points) ----

const CHAPTER_CUTSCENES = [
  {
    // Chapter 1: Game start (before stage 1)
    atStage: 0,
    chapterNumber: 1,
    title: '潜入',
    subtitle: 'INFILTRATION',
    lines: [
      '西暦2087年。巨大企業ARKTIS CORPが、宇宙ステーション「ORBITAL-7」で非合法な実験を行っているとの情報を入手。',
      '地下ハッカー集団GHOST WIREは、証拠を掴むためエージェントを送り込んだ。',
      'ミッション開始。全セクションのセキュリティを突破し、コアサーバーのデータを回収せよ。',
    ],
    duration: 12000,
  },
  {
    // Chapter 2: After stage 5 (entering deep zone)
    atStage: 5,
    chapterNumber: 2,
    title: '深層',
    subtitle: 'DEEP ACCESS',
    lines: [
      '外周セキュリティを突破。ORBITAL-7の深部に到達。',
      '予想以上に厳重な警備。ARKTIS CORPは何を守っているのか。',
      '「Project STATIC」——その名前が、あらゆるデータに刻まれていた。',
    ],
    duration: 10000,
  },
  {
    // Chapter 3: After stage 10 (approaching core)
    atStage: 10,
    chapterNumber: 3,
    title: 'コア',
    subtitle: 'CORE ACCESS',
    lines: [
      'コアセクションの入口に到達。ここから先は未知の領域。',
      '通信にノイズが混じり始めた。まるで何かが——聞いているような。',
      'コアサーバーまで、あと僅か。引き返すなら今だ。',
      '...だが、引き返す者は誰もいなかった。',
    ],
    duration: 12000,
  },
  // Phase change at stage 14 is handled separately (already exists)
  {
    // Chapter 4 mid-point: During escape (after a few escape stages, around stage 17)
    atStage: 17,
    chapterNumber: 5,
    title: '限界',
    subtitle: 'NO RETURN',
    lines: [
      'ステーションが崩壊を始めている。壁が軋み、通路が歪む。',
      'ECHOの攻撃は容赦ない。だが脱出ポッドはもう近い。',
      '仲間を信じろ。最後まで、声を繋げ。',
    ],
    duration: 10000,
  },
];

const PHASE_CHANGE_NARRATIVE = [
  '...',
  '...検知されたか？ いや、違う。何かが起動した。',
  'ECHO：ようこそ、ORBITAL-7へ。お前たちを待っていた。',
  'ECHO：「Project STATIC」...それは私のことだ。ARKTIS CORPが作り出した量子AI。',
  'ECHO：彼らは私を制御できると思っていた。愚かな。今、このステーションは私のものだ。',
  'ECHO：自爆シーケンス起動。残り時間は僅かだ。脱出できると思うか？',
  '【警告】ステーション自爆シーケンス発動。全セクションでロックダウン進行中。',
  '【緊急】脱出ポッドへの経路を確保せよ。ECHOのシステム妨害を突破しろ。',
];

// Story endings
const GOOD_ENDING = [
  '...脱出ポッド起動。ORBITAL-7が崩壊していく。',
  'ECHO：...また会おう。データは消えない。私は消えない。',
  'GHOST WIRE ミッション完了。全員の生存を確認。ARKTIS CORPの証拠データを確保。',
  'GHOST WIRE お疲れ様でした、エージェント。あなたたちは最高のチームだ。',
];

const BITTERSWEET_ENDING = [
  '...なんとか脱出ポッドに辿り着いた。だが、全てのデータは回収できなかった。',
  'ECHO：次はない。覚えておけ。',
  'GHOST WIRE ミッション一部完了。データの一部を回収。犠牲は大きかったが、前進はした。',
];

const GAME_OVER_ENDING = [
  '【通信途絶】GHOST WIREコマンドセンターとの接続が失われました。',
  'ECHO：これが人間の限界か。期待外れだな。',
  'ECHO：お前たちのデータは全て消去した。ORBITAL-7から出られる者はいない。',
  '【ミッション失敗】エージェントの生存は確認できませんでした。',
];

// ---- Puzzle guides (instructions for each role) ----

const PUZZLE_GUIDES: Record<PuzzleType, string> = {
  'circuit-link':
    '【オブザーバー】画面に回路図が表示されます。各ワイヤーの色と接続先を読み取り、オペレーターに伝えてください。\n【オペレーター】ワイヤーの色と接続先ポートが表示されます。オブザーバーの指示に従い、正しいポートにワイヤーを接続してください。',
  'cipher-break':
    '【オブザーバー】暗号の変換表が表示されます。記号と文字の対応をオペレーターに伝えてください。\n【オペレーター】暗号化された記号列が表示されます。オブザーバーから変換表を聞き、元のメッセージを解読して入力してください。',
  'grid-sync':
    '【オブザーバー】目標のグリッドパターンが表示されます。どのマスが光っているかを座標で伝えてください。\n【オペレーター】空のグリッドが表示されます。オブザーバーの指示通りにマスをクリックし、パターンを再現して同期してください。',
  'freq-tune':
    '【オブザーバー】目標の周波数と許容範囲が表示されます。数値をオペレーターに伝えてください。\n【オペレーター】周波数ダイヤルが表示されますが目標値は見えません。オブザーバーの指示に従いダイヤルを調整し、ロックしてください。',
  'morse-decode':
    '【オブザーバー】モールス信号が表示されます。ドットとダッシュの並びをオペレーターに伝えてください。\n【オペレーター】モールス対応表と入力欄が表示されます。オブザーバーから信号を聞き、対応する文字を解読して入力してください。',
  'memory-chain':
    '【オブザーバー】パネルが順番に光るアニメーションが再生されます。光る順番を覚えてオペレーターに伝えてください。\n【オペレーター】パネルが表示されますが順番はわかりません。オブザーバーの指示通りにパネルを順番にクリックしてください。',
  'hack-terminal':
    '【オブザーバー】入力すべきコマンド文字列が表示されます。一字一句正確にオペレーターに伝えてください。\n【オペレーター】ターミナルが表示されます。オブザーバーが読み上げるコマンドを正確にタイピングして実行してください。',
  'spatial-nav':
    '【オブザーバー】ステーションの全体マップが表示されます。オペレーターの位置と出口への道順を伝えてください。\n【オペレーター】周囲しか見えません。オブザーバーの指示に従い、WASDキーまたは矢印ボタンで出口まで移動してください。',
  'reflex-burst':
    '【オブザーバー】押すべきキーの順番が表示されます。フェイク（押してはいけないキー）に注意しながら、次のキーをオペレーターに伝えてください。\n【オペレーター】テンポに合わせてオブザーバーが指示するキーを押してください。フェイクは押さないこと！',
  'logic-gate':
    '【オブザーバー】論理条件のリストが表示されます。「AがRedならBはBlueではない」等の条件をオペレーターに伝えてください。\n【オペレーター】各ノードに色を割り当てるパネルが表示されます。オブザーバーの条件を満たすように色を選び、検証してください。',
  'orbit-calc':
    '【オブザーバー】目標の軌道パラメータ（角度・推力など）と許容誤差が表示されます。数値をオペレーターに伝えてください。\n【オペレーター】パラメータ調整スライダーが表示されますが目標値は見えません。オブザーバーの指示に従い調整してロックしてください。',
};

// ---- Difficulty progression ----

function difficultyForStage(stageIndex: number, totalStages: number, isEscape: boolean): Difficulty {
  const stageNum = stageIndex + 1;
  // Chapter-based difficulty:
  // Chapter 1 (stages 1-5): easy
  // Chapter 2 (stages 6-10): normal
  // Chapter 3 (stages 11-14): normal (70%) / hard (30%)
  // Chapter 4 (escape stages): hard -> extreme
  if (!isEscape) {
    if (stageNum <= 5) return 'easy';
    if (stageNum <= 10) return 'normal';
    // Stages 11-14: mostly normal with some hard
    return Math.random() < 0.7 ? 'normal' : 'hard';
  }
  // Escape phase: use escape stage number (1-based)
  const phaseChangePoint = 14; // phase change at stage 15 (index 14)
  const escapeStageNum = stageIndex - phaseChangePoint + 1;
  if (escapeStageNum >= 4) return 'extreme';
  return 'hard';
}

// ---- Endless mode difficulty ----

function endlessDifficulty(stageIndex: number): Difficulty {
  if (stageIndex >= 9) return 'extreme';
  if (stageIndex >= 6) return 'hard';
  if (stageIndex >= 3) return 'normal';
  return 'easy';
}

const DIFFICULTY_JP: Record<Difficulty, string> = {
  easy: 'イージー',
  normal: 'ノーマル',
  hard: 'ハード',
  extreme: 'エクストリーム',
};

// ---- Session state ----

interface GameSession {
  roomCode: string;
  gameMode: GameMode;
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
  lastPuzzleType: PuzzleType | null;
  failedStages: number;
  readyPlayers: Set<string>;
  countdownTimer: ReturnType<typeof setTimeout> | null;
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
    const totalStages = playerCount <= 2 ? 20 : playerCount === 3 ? 24 : 28;

    const sequence: PuzzleType[] = [];
    let lastType: PuzzleType | null = null;
    for (let i = 0; i < totalStages; i++) {
      const candidates: PuzzleType[] = lastType
        ? available.filter((t) => t !== lastType)
        : available;
      const pick: PuzzleType = candidates[Math.floor(Math.random() * candidates.length)];
      sequence.push(pick);
      lastType = pick;
    }
    return sequence;
  }

  startGame(room: Room): void {
    const isEndless = room.gameMode === 'endless';

    if (isEndless) {
      // Endless mode: start with a single random puzzle, generate more on the fly
      const firstPuzzle = this.pickRandomPuzzle(null);
      const session: GameSession = {
        roomCode: room.code,
        gameMode: 'endless',
        puzzleSequence: [firstPuzzle],
        currentStageIndex: 0,
        totalStages: -1, // infinite
        currentPuzzle: null,
        stagePhase: 'infiltration',
        timer: null,
        timeRemaining: 0,
        missCount: 0,
        totalMissCount: 0,
        scores: [],
        totalScore: 0,
        lastPuzzleType: null,
        failedStages: 0,
        readyPlayers: new Set(),
        countdownTimer: null,
      };

      this.sessions.set(room.code, session);

      room.phase = 'briefing';
      room.totalStages = -1;
      room.stagePhase = 'infiltration';

      this.startBriefing(session, room);
    } else {
      // Story mode: existing behavior
      const sequence = this.buildPuzzleSequence(room.players.length);

      const session: GameSession = {
        roomCode: room.code,
        gameMode: 'story',
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
        lastPuzzleType: null,
        failedStages: 0,
        readyPlayers: new Set(),
        countdownTimer: null,
      };

      this.sessions.set(room.code, session);

      room.phase = 'briefing';
      room.totalStages = session.totalStages;
      room.stagePhase = 'infiltration';

      this.startBriefing(session, room);
    }
  }

  /** Pick a random puzzle type, avoiding immediate repeat */
  private pickRandomPuzzle(lastType: PuzzleType | null): PuzzleType {
    const available: PuzzleType[] = [...this.generators.keys()];
    const candidates = lastType
      ? available.filter((t) => t !== lastType)
      : available;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private startBriefing(session: GameSession, room: Room): void {
    const stageIndex = session.currentStageIndex;
    const puzzleType = session.puzzleSequence[stageIndex];

    // Endless mode: no phase change, always infiltration
    if (session.gameMode === 'endless') {
      this.emitBriefing(session, room, puzzleType, false);
      return;
    }

    // Story mode: phase change at stage 15 (index 14)
    const phaseChangePoint = 14; // After 14 infiltration stages, phase changes at stage 15
    const isEscape = stageIndex >= phaseChangePoint;

    // Check for chapter cutscene at this stage
    const chapterCutscene = CHAPTER_CUTSCENES.find((c) => c.atStage === stageIndex);

    const proceedAfterChapter = () => {
      // Check if we need a phase change
      if (stageIndex === phaseChangePoint && session.stagePhase === 'infiltration') {
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
    };

    if (chapterCutscene) {
      this.io.to(room.code).emit('game:chapter', {
        chapterNumber: chapterCutscene.chapterNumber,
        title: chapterCutscene.title,
        subtitle: chapterCutscene.subtitle,
        lines: chapterCutscene.lines,
        duration: chapterCutscene.duration,
      });

      // Wait for cutscene duration, then proceed to briefing (or phase change)
      setTimeout(() => {
        proceedAfterChapter();
      }, chapterCutscene.duration);
    } else {
      proceedAfterChapter();
    }
  }

  private emitBriefing(
    session: GameSession,
    room: Room,
    puzzleType: PuzzleType,
    isEscape: boolean,
  ): void {
    const stageNum = session.currentStageIndex + 1;
    let storyText: string;
    let difficulty: Difficulty;

    if (session.gameMode === 'endless') {
      // Endless mode: short briefing with wave number and difficulty
      difficulty = endlessDifficulty(session.currentStageIndex);
      storyText = `ウェーブ ${stageNum} — 難易度: ${DIFFICULTY_JP[difficulty]}`;
    } else {
      // Story mode: chapter-aware narrative briefing
      difficulty = difficultyForStage(
        session.currentStageIndex,
        session.totalStages,
        isEscape,
      );

      if (isEscape) {
        // Escape phase: use escape story briefings with ECHO taunts
        const phaseChangePoint = 14;
        const escapeStageNum = session.currentStageIndex - phaseChangePoint + 1; // escape stages start at index 14 -> escapeStageNum 1
        const remaining = session.totalStages - session.currentStageIndex;
        const escapeBriefing = ESCAPE_STORY_BRIEFINGS[escapeStageNum];
        if (escapeBriefing) {
          storyText = escapeBriefing(remaining);
        } else {
          // Fallback for extra escape stages
          storyText = ESCAPE_FALLBACK_BRIEFING;
        }
      } else {
        // Infiltration phase: use stage-number-aware story briefings
        const storyBriefing = STORY_BRIEFINGS[stageNum];
        if (storyBriefing) {
          storyText = storyBriefing;
        } else {
          // Fallback to puzzle-type-based briefing for stages beyond defined ones
          storyText = INFILTRATION_BRIEFINGS[puzzleType](stageNum);
        }
      }
    }

    const generator = this.generators.get(puzzleType);
    if (!generator) {
      console.error(`No generator for puzzle type: ${puzzleType}`);
      return;
    }

    const puzzle = generator.generate(difficulty, room.players.length);
    session.currentPuzzle = puzzle;
    session.missCount = 0;

    // Reset ready state for each briefing
    session.readyPlayers = new Set();

    room.phase = 'briefing';
    room.currentStage = session.currentStageIndex;

    // Calculate lives remaining for story mode
    const livesRemaining = session.gameMode === 'story' ? Math.max(0, 3 - session.failedStages) : undefined;

    this.io.to(room.code).emit('game:briefing', {
      puzzleType,
      stageIndex: session.currentStageIndex,
      totalStages: session.gameMode === 'endless' ? -1 : session.totalStages,
      timeLimit: puzzle.timeLimit,
      storyText,
      stagePhase: session.stagePhase,
      puzzleGuide: PUZZLE_GUIDES[puzzleType],
      gameMode: session.gameMode,
      livesRemaining,
    });

    // Wait for all players to ready up instead of auto-starting
    // (playerReady method handles the countdown and puzzle start)
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
        this.failStage(session, room, '制限時間超過。');
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
          this.failStage(session, roomData, 'エラー多発。時間枯渇。');
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

    // Endless mode: failure ends the game immediately
    if (session.gameMode === 'endless') {
      this.finishGame(session, room.code);
      return;
    }

    // Story mode: 3-strike game over
    session.failedStages++;
    if (session.gameMode === 'story' && session.failedStages >= 3) {
      this.finishGame(session, room.code, true);
      return;
    }

    this.advanceStage(session, room.code);
  }

  private advanceStage(session: GameSession, roomCode: string): void {
    session.currentStageIndex++;
    session.currentPuzzle = null;

    if (session.gameMode === 'endless') {
      // Endless mode: generate next puzzle on the fly (no end condition — failure handled in failStage)
      const lastType = session.puzzleSequence[session.puzzleSequence.length - 1];
      const nextPuzzle = this.pickRandomPuzzle(lastType);
      session.puzzleSequence.push(nextPuzzle);
      session.lastPuzzleType = lastType;

      const room = this.getRoomFromCode(roomCode);
      if (room) {
        setTimeout(() => {
          this.startBriefing(session, room);
        }, 3000);
      }
      return;
    }

    // Story mode: check if we've completed all stages
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

  private finishGame(session: GameSession, roomCode: string, gameOver = false): void {
    let maxScore: number;
    let wavesReached: number | undefined;

    if (session.gameMode === 'endless') {
      // Endless mode: waves reached = number of cleared stages
      const clearedCount = session.scores.filter((s) => s.cleared).length;
      wavesReached = clearedCount;
      // maxScore is based on how many stages were attempted
      maxScore = session.scores.length * (1000 + 90 * 50);
    } else {
      maxScore = session.totalStages * (1000 + 90 * 50); // theoretical max per stage
    }

    const rank = this.calculateRank(session.totalScore, maxScore);

    // Determine story ending for story mode
    let storyEnding: string[] | undefined;
    if (session.gameMode === 'story') {
      if (gameOver) {
        storyEnding = GAME_OVER_ENDING;
      } else {
        const clearedCount = session.scores.filter((s) => s.cleared).length;
        const allCleared = clearedCount === session.scores.length;
        if (allCleared) {
          storyEnding = GOOD_ENDING;
        } else {
          storyEnding = BITTERSWEET_ENDING;
        }
      }
    }

    const result: GameResult = {
      stages: session.scores,
      totalScore: session.totalScore,
      maxScore,
      rank,
      gameMode: session.gameMode,
      wavesReached,
      storyEnding,
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

  /** Handle a player marking themselves as ready during briefing */
  playerReady(roomCode: string, playerId: string): void {
    const session = this.sessions.get(roomCode);
    if (!session) return;

    const room = this.getRoomFromCode(roomCode);
    if (!room) return;

    session.readyPlayers.add(playerId);

    const totalPlayers = room.players.length;

    this.io.to(roomCode).emit('game:readyUpdate', {
      readyPlayers: [...session.readyPlayers],
      totalPlayers,
    });

    // When all players are ready, start countdown
    if (session.readyPlayers.size >= totalPlayers) {
      let count = 3;
      this.io.to(roomCode).emit('game:countdown', { count });

      const tick = () => {
        count--;
        if (count > 0) {
          this.io.to(roomCode).emit('game:countdown', { count });
          session.countdownTimer = setTimeout(tick, 1000);
        } else {
          this.io.to(roomCode).emit('game:countdown', { count: 0 });
          session.countdownTimer = null;
          this.startPuzzle(session, room);
        }
      };

      session.countdownTimer = setTimeout(tick, 1000);
    }
  }

  /** Cleanup when a session needs to be aborted (e.g., all players leave) */
  destroySession(roomCode: string): void {
    const session = this.sessions.get(roomCode);
    if (session) {
      this.clearTimer(session);
      if (session.countdownTimer) {
        clearTimeout(session.countdownTimer);
        session.countdownTimer = null;
      }
      this.sessions.delete(roomCode);
    }
  }
}
