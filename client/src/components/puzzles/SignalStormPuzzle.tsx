// ===== STATIC ORBIT — Signal Storm Boss Puzzle =====

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../hooks/useSocket';
import { useGameStore } from '../../stores/gameStore';

interface PuzzleProps {
  roleData: Record<string, unknown>;
  role: 'observer' | 'operator' | 'navigator' | 'hacker';
}

interface TargetData {
  id: string;
  x: number;
  y: number;
  shape: string;
  color: string;
  isReal?: boolean;
  round: number;
}

/* -- Boss Styles -------------------------------------------------- */

const containerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 880,
  margin: '0 auto',
  fontFamily: "'Share Tech Mono', 'Courier New', monospace",
  color: '#e0e0e0',
};

const bossPanelStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(8,5,18,0.97) 0%, rgba(15,10,30,0.95) 100%)',
  border: '1px solid rgba(255,170,30,0.3)',
  borderRadius: 2,
  padding: 24,
  position: 'relative',
  overflow: 'hidden',
};

const bossHeaderStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', sans-serif",
  fontSize: 14,
  letterSpacing: 3,
  textTransform: 'uppercase' as const,
  color: '#ffaa22',
  textAlign: 'center' as const,
  marginBottom: 24,
  paddingBottom: 12,
  borderBottom: '1px solid rgba(255,170,30,0.25)',
};

const scanlineOverlay: React.CSSProperties = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,170,30,0.008) 2px, rgba(255,170,30,0.008) 4px)',
  pointerEvents: 'none',
  zIndex: 1,
};

const gridOverlay: React.CSSProperties = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundImage:
    'linear-gradient(rgba(255,170,30,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,170,30,0.02) 1px, transparent 1px)',
  backgroundSize: '20px 20px',
  pointerEvents: 'none',
  zIndex: 0,
};

const cornerDecor = (position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 12, height: 12,
    borderColor: 'rgba(255,170,30,0.5)',
    borderStyle: 'solid',
    borderWidth: 0,
    zIndex: 2,
  };
  switch (position) {
    case 'topLeft': return { ...base, top: 4, left: 4, borderTopWidth: 2, borderLeftWidth: 2 };
    case 'topRight': return { ...base, top: 4, right: 4, borderTopWidth: 2, borderRightWidth: 2 };
    case 'bottomLeft': return { ...base, bottom: 4, left: 4, borderBottomWidth: 2, borderLeftWidth: 2 };
    case 'bottomRight': return { ...base, bottom: 4, right: 4, borderBottomWidth: 2, borderRightWidth: 2 };
  }
};

/* -- Shape renderer ----------------------------------------------- */

const SHAPE_JP: Record<string, string> = {
  circle: '\u5186',
  square: '\u56DB\u89D2',
  triangle: '\u4E09\u89D2',
  diamond: '\u3072\u3057\u5F62',
};

const COLOR_HEX: Record<string, string> = {
  red: '#ff3344',
  blue: '#3388ff',
  green: '#33ff66',
  yellow: '#ffdd33',
  cyan: '#00f0ff',
  magenta: '#ff33cc',
};

const COLOR_JP: Record<string, string> = {
  red: '\u8D64',
  blue: '\u9752',
  green: '\u7DD1',
  yellow: '\u9EC4',
  cyan: '\u30B7\u30A2\u30F3',
  magenta: '\u30DE\u30BC\u30F3\u30BF',
};

function ShapeIcon({ shape, color, size = 28 }: { shape: string; color: string; size?: number }) {
  const hex = COLOR_HEX[color] || '#ffffff';

  switch (shape) {
    case 'circle':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="11" fill={hex} opacity={0.8}
            style={{ filter: `drop-shadow(0 0 4px ${hex}80)` }} />
        </svg>
      );
    case 'square':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28">
          <rect x="3" y="3" width="22" height="22" fill={hex} opacity={0.8}
            style={{ filter: `drop-shadow(0 0 4px ${hex}80)` }} />
        </svg>
      );
    case 'triangle':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28">
          <polygon points="14,2 26,26 2,26" fill={hex} opacity={0.8}
            style={{ filter: `drop-shadow(0 0 4px ${hex}80)` }} />
        </svg>
      );
    case 'diamond':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28">
          <polygon points="14,1 27,14 14,27 1,14" fill={hex} opacity={0.8}
            style={{ filter: `drop-shadow(0 0 4px ${hex}80)` }} />
        </svg>
      );
    default:
      return <div style={{ width: size, height: size, background: hex, borderRadius: '50%' }} />;
  }
}

/* -- Observer View ------------------------------------------------ */

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const realSignal = roleData.realSignal as { shape: string; color: string; shapeJP: string; colorJP: string };
  const targets = roleData.targets as TargetData[];
  const captureTarget = roleData.captureTarget as number;

  // Group by round
  const rounds: Record<number, TargetData[]> = {};
  for (const t of targets) {
    if (!rounds[t.round]) rounds[t.round] = [];
    rounds[t.round].push(t);
  }

  return (
    <div style={containerStyle}>
      <div style={bossPanelStyle}>
        <div style={scanlineOverlay} />
        <div style={gridOverlay} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={bossHeaderStyle}>
          <div style={{ marginBottom: 4 }}>/// シグナルストーム ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,170,30,0.5)', letterSpacing: 2 }}>
            本物のシグナル情報をオペレーターに伝えてください
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 3 }}>
          {/* Target signal description */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '18px 24px',
              marginBottom: 20,
              background: 'rgba(255,170,30,0.06)',
              borderLeft: '3px solid rgba(255,170,30,0.5)',
              display: 'flex', alignItems: 'center', gap: 20,
            }}
          >
            <ShapeIcon shape={realSignal.shape} color={realSignal.color} size={48} />
            <div>
              <div style={{
                fontSize: 10, color: 'rgba(255,170,30,0.5)',
                letterSpacing: 2, marginBottom: 6,
                fontFamily: "'Orbitron', sans-serif",
              }}>
                本物のシグナル
              </div>
              <div style={{
                fontSize: 22, color: '#ffaa22',
                textShadow: '0 0 10px rgba(255,170,30,0.4)',
                letterSpacing: 3,
              }}>
                {realSignal.colorJP}の{realSignal.shapeJP}
              </div>
            </div>
            <div style={{
              marginLeft: 'auto',
              fontSize: 11, color: 'rgba(255,170,30,0.4)',
              letterSpacing: 1,
            }}>
              目標: {captureTarget}体
            </div>
          </motion.div>

          {/* Per-round real target info */}
          <div style={{ overflowY: 'auto', maxHeight: 280 }}>
            {Object.entries(rounds).map(([round, roundTargets]) => {
              const realOnes = roundTargets.filter(t => t.isReal);
              return (
                <div key={round} style={{
                  padding: '8px 14px',
                  marginBottom: 4,
                  background: 'rgba(255,170,30,0.03)',
                  borderLeft: '2px solid rgba(255,170,30,0.2)',
                }}>
                  <span style={{
                    fontSize: 10, color: 'rgba(255,170,30,0.4)',
                    fontFamily: "'Orbitron', sans-serif", letterSpacing: 1,
                    marginRight: 12,
                  }}>
                    R{Number(round) + 1}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(51,255,102,0.7)' }}>
                    本物: {realOnes.length}体
                  </span>
                  {realOnes.map(t => (
                    <span key={t.id} style={{
                      marginLeft: 10, fontSize: 11, color: '#00f0ff',
                      padding: '2px 8px',
                      background: 'rgba(0,240,255,0.08)',
                      border: '1px solid rgba(0,240,255,0.2)',
                    }}>
                      ({t.x},{t.y})
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -- Operator View ------------------------------------------------ */

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const targets = roleData.targets as TargetData[];
  const gridSize = roleData.gridSize as number;
  const totalRounds = roleData.totalRounds as number;
  const captureTarget = roleData.captureTarget as number;
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [currentRound, setCurrentRound] = useState(0);
  const [captured, setCaptured] = useState<Set<string>>(() => new Set());
  const [score, setScore] = useState(0);

  const prevFeedback = useRef(lastFeedback);
  useEffect(() => {
    if (lastFeedback && lastFeedback !== prevFeedback.current) {
      const match = lastFeedback.feedback?.match(/\((\d+)\/(\d+)\)/);
      if (match) setScore(parseInt(match[1], 10));
    }
    prevFeedback.current = lastFeedback;
  }, [lastFeedback]);

  const roundTargets = targets.filter(t => t.round === currentRound);

  const handleCapture = useCallback((targetId: string) => {
    if (captured.has(targetId)) return;
    setCaptured(prev => new Set(prev).add(targetId));
    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'signal-storm',
      action: 'capture',
      data: { targetId },
    });
  }, [captured]);

  const handleNextRound = useCallback(() => {
    setCurrentRound(p => Math.min(p + 1, totalRounds - 1));
  }, [totalRounds]);

  // Build grid with targets placed
  const gridCells: (TargetData | null)[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => null)
  );
  for (const t of roundTargets) {
    if (t.y >= 0 && t.y < gridSize && t.x >= 0 && t.x < gridSize && !captured.has(t.id)) {
      gridCells[t.y][t.x] = t;
    }
  }

  return (
    <div style={containerStyle}>
      <div style={{
        ...bossPanelStyle,
        border: '1px solid rgba(255,170,30,0.4)',
      }}>
        <div style={scanlineOverlay} />
        <div style={gridOverlay} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={{
          ...bossHeaderStyle,
          color: '#ffbb00',
          borderBottomColor: 'rgba(255,180,0,0.25)',
        }}>
          <div style={{ marginBottom: 4 }}>/// シグナルストーム ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,180,0,0.5)', letterSpacing: 2 }}>
            本物のターゲットをクリックしてキャプチャせよ
          </div>
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {lastFeedback && (
            <motion.div
              key={lastFeedback.feedback}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'tween', duration: 0.15 }}
              style={{
                padding: '6px 16px',
                marginBottom: 12,
                textAlign: 'center',
                fontSize: 12, letterSpacing: 1,
                background: lastFeedback.correct ? 'rgba(51,255,102,0.1)' : 'rgba(255,51,51,0.15)',
                border: `1px solid ${lastFeedback.correct ? 'rgba(51,255,102,0.3)' : 'rgba(255,51,51,0.4)'}`,
                color: lastFeedback.correct ? '#33ff66' : '#ff3333',
                position: 'relative', zIndex: 3,
              }}
            >
              {lastFeedback.feedback}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ position: 'relative', zIndex: 3 }}>
          {/* Score + round info */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginBottom: 14,
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, color: 'rgba(255,170,30,0.5)', letterSpacing: 1 }}>
              ラウンド {currentRound + 1} / {totalRounds}
            </span>
            <div style={{
              fontSize: 20, fontWeight: 'bold',
              color: score >= captureTarget ? '#33ff66' : '#ffaa22',
              textShadow: `0 0 8px ${score >= captureTarget ? 'rgba(51,255,102,0.4)' : 'rgba(255,170,30,0.4)'}`,
              fontFamily: "'Share Tech Mono', monospace",
              letterSpacing: 3,
            }}>
              {score} / {captureTarget}
            </div>
          </div>

          {/* 6x6 Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gap: 4,
            marginBottom: 16,
            padding: 8,
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,170,30,0.15)',
          }}>
            {gridCells.map((row, y) =>
              row.map((cell, x) => (
                <motion.div
                  key={`${x}-${y}`}
                  whileHover={cell ? { scale: 1.1 } : {}}
                  whileTap={cell ? { scale: 0.9 } : {}}
                  onClick={() => cell && handleCapture(cell.id)}
                  style={{
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: cell
                      ? 'rgba(255,170,30,0.08)'
                      : 'rgba(255,255,255,0.015)',
                    border: `1px solid ${cell ? 'rgba(255,170,30,0.25)' : 'rgba(255,255,255,0.04)'}`,
                    cursor: cell ? 'pointer' : 'default',
                    minHeight: 48,
                    position: 'relative',
                  }}
                >
                  {cell && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ShapeIcon shape={cell.shape} color={cell.color} size={32} />
                    </motion.div>
                  )}
                  {!cell && (
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.1)' }}>
                      {x},{y}
                    </span>
                  )}
                </motion.div>
              ))
            )}
          </div>

          {/* Round navigation */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentRound(p => Math.max(0, p - 1))}
              disabled={currentRound === 0}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.3)',
                padding: '8px 20px',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 11, letterSpacing: 2, cursor: 'pointer',
                opacity: currentRound === 0 ? 0.3 : 1,
              }}
            >
              &#9664; 前
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNextRound}
              disabled={currentRound >= totalRounds - 1}
              style={{
                background: 'linear-gradient(135deg, rgba(255,170,30,0.15), rgba(255,170,30,0.3))',
                border: '1px solid rgba(255,170,30,0.4)',
                color: '#ffaa22',
                padding: '8px 20px',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 11, letterSpacing: 2, cursor: 'pointer',
                opacity: currentRound >= totalRounds - 1 ? 0.3 : 1,
              }}
            >
              次 &#9654;
            </motion.button>
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: 16 }}>
            <div style={{ height: 4, background: 'rgba(255,170,30,0.1)', overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${(score / captureTarget) * 100}%` }}
                transition={{ duration: 0.3 }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #ffaa22, #33ff66)',
                  boxShadow: '0 0 8px rgba(255,170,30,0.4)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -- Main Component ----------------------------------------------- */

export default function SignalStormPuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
