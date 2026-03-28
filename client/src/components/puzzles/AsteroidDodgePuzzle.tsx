// ===== STATIC ORBIT — Asteroid Dodge Boss Puzzle =====

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../hooks/useSocket';
import { useGameStore } from '../../stores/gameStore';

interface PuzzleProps {
  roleData: Record<string, unknown>;
  role: 'observer' | 'operator' | 'navigator' | 'hacker';
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
  background: 'linear-gradient(135deg, rgba(15,5,5,0.97) 0%, rgba(25,8,8,0.95) 100%)',
  border: '1px solid rgba(255,100,50,0.3)',
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
  color: '#ff6633',
  textAlign: 'center' as const,
  marginBottom: 24,
  paddingBottom: 12,
  borderBottom: '1px solid rgba(255,100,50,0.25)',
};

const scanlineOverlay: React.CSSProperties = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,100,50,0.01) 2px, rgba(255,100,50,0.01) 4px)',
  pointerEvents: 'none',
  zIndex: 1,
};

const gridOverlay: React.CSSProperties = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundImage:
    'linear-gradient(rgba(255,100,50,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,100,50,0.02) 1px, transparent 1px)',
  backgroundSize: '20px 20px',
  pointerEvents: 'none',
  zIndex: 0,
};

const cornerDecor = (position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 12, height: 12,
    borderColor: 'rgba(255,100,50,0.5)',
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

/* -- Observer View ------------------------------------------------ */

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const asteroidPattern = roleData.asteroidPattern as number[][];
  const laneCount = roleData.laneCount as number;
  const totalWaves = roleData.totalWaves as number;
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  // Track current wave from feedback
  const [currentWave, setCurrentWave] = useState(0);
  const prevFeedback = useRef(lastFeedback);
  useEffect(() => {
    if (lastFeedback && lastFeedback !== prevFeedback.current) {
      const match = lastFeedback.feedback?.match(/ウェーブ(\d+)/);
      if (match) setCurrentWave(parseInt(match[1], 10));
    }
    prevFeedback.current = lastFeedback;
  }, [lastFeedback]);

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
          <div style={{ marginBottom: 4 }}>/// 小惑星パターン ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,100,50,0.5)', letterSpacing: 2 }}>
            安全なレーンをオペレーターに伝えてください
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 3, overflowY: 'auto', maxHeight: 380 }}>
          {/* Lane headers */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 6, paddingLeft: 60 }}>
            {Array.from({ length: laneCount }, (_, i) => (
              <div key={i} style={{
                width: 36, textAlign: 'center',
                fontSize: 10, color: 'rgba(255,100,50,0.5)',
                fontFamily: "'Orbitron', sans-serif",
                letterSpacing: 1,
              }}>
                L{i}
              </div>
            ))}
          </div>

          {/* Wave rows */}
          {asteroidPattern.map((blocked, waveIdx) => {
            const isCurrent = waveIdx === currentWave;
            const isPast = waveIdx < currentWave;
            return (
              <motion.div
                key={waveIdx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: isPast ? 0.3 : 1, x: 0 }}
                transition={{ delay: waveIdx * 0.02 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  marginBottom: 2,
                  background: isCurrent ? 'rgba(255,100,50,0.12)' : 'transparent',
                  borderLeft: isCurrent ? '3px solid #ff6633' : '3px solid transparent',
                  paddingLeft: isCurrent ? 5 : 8,
                }}
              >
                <div style={{
                  width: 48, fontSize: 10, color: isCurrent ? '#ff6633' : 'rgba(255,255,255,0.3)',
                  fontFamily: "'Share Tech Mono', monospace",
                }}>
                  W{String(waveIdx + 1).padStart(2, '0')}
                </div>
                {Array.from({ length: laneCount }, (_, lane) => {
                  const isBlocked = blocked.includes(lane);
                  return (
                    <div key={lane} style={{
                      width: 36, height: 24,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isBlocked
                        ? 'rgba(255,50,50,0.2)'
                        : 'rgba(51,255,102,0.05)',
                      border: `1px solid ${isBlocked ? 'rgba(255,50,50,0.4)' : 'rgba(51,255,102,0.1)'}`,
                      fontSize: 12,
                      color: isBlocked ? '#ff3333' : 'rgba(51,255,102,0.3)',
                    }}>
                      {isBlocked ? '\u26A0' : '\u00B7'}
                    </div>
                  );
                })}
              </motion.div>
            );
          })}
        </div>

        {/* Progress */}
        <div style={{ marginTop: 16, position: 'relative', zIndex: 3 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 10, color: 'rgba(255,100,50,0.5)', letterSpacing: 1, marginBottom: 4,
          }}>
            <span>進行状況</span>
            <span>{currentWave} / {totalWaves}</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,100,50,0.1)', overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${(currentWave / totalWaves) * 100}%` }}
              transition={{ duration: 0.4 }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #ff6633, #ff3333)',
                boxShadow: '0 0 8px rgba(255,100,50,0.4)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* -- Operator View ------------------------------------------------ */

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const laneCount = roleData.laneCount as number;
  const startPosition = roleData.startPosition as number;
  const targetWaves = roleData.targetWaves as number;
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [shipPos, setShipPos] = useState(startPosition);
  const [waveCount, setWaveCount] = useState(0);
  const [survived, setSurvived] = useState(0);

  const prevFeedback = useRef(lastFeedback);
  useEffect(() => {
    if (lastFeedback && lastFeedback !== prevFeedback.current) {
      const match = lastFeedback.feedback?.match(/ウェーブ(\d+)/);
      if (match) setWaveCount(parseInt(match[1], 10));
      if (lastFeedback.correct && lastFeedback.feedback?.includes('回避成功')) {
        setSurvived(p => p + 1);
      }
    }
    prevFeedback.current = lastFeedback;
  }, [lastFeedback]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        setShipPos(p => Math.max(0, p - 1));
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        setShipPos(p => Math.min(laneCount - 1, p + 1));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [laneCount]);

  const handleMove = useCallback((dir: 'left' | 'right') => {
    setShipPos(p => {
      const next = dir === 'left' ? Math.max(0, p - 1) : Math.min(laneCount - 1, p + 1);
      return next;
    });
  }, [laneCount]);

  const handleTick = useCallback(() => {
    const socket = getSocket();
    // Emit move first
    socket.emit('game:action', {
      puzzleId: 'asteroid-dodge',
      action: 'move',
      data: { position: shipPos },
    });
    // Then tick
    setTimeout(() => {
      socket.emit('game:action', {
        puzzleId: 'asteroid-dodge',
        action: 'tick',
        data: { currentPosition: shipPos },
      });
    }, 50);
  }, [shipPos]);

  return (
    <div style={containerStyle}>
      <div style={{
        ...bossPanelStyle,
        border: '1px solid rgba(255,80,30,0.4)',
      }}>
        <div style={scanlineOverlay} />
        <div style={gridOverlay} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={{
          ...bossHeaderStyle,
          color: '#ff4422',
          borderBottomColor: 'rgba(255,68,34,0.25)',
        }}>
          <div style={{ marginBottom: 4 }}>/// 小惑星回避 ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,68,34,0.5)', letterSpacing: 2 }}>
            A/D または矢印キーで移動 -- オブザーバーの指示に従え
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
              transition={{ type: 'tween', duration: 0.2 }}
              style={{
                padding: '8px 16px',
                marginBottom: 16,
                textAlign: 'center',
                fontSize: 12,
                letterSpacing: 1,
                background: lastFeedback.correct ? 'rgba(51,255,102,0.1)' : 'rgba(255,51,51,0.15)',
                border: `1px solid ${lastFeedback.correct ? 'rgba(51,255,102,0.3)' : 'rgba(255,51,51,0.4)'}`,
                color: lastFeedback.correct ? '#33ff66' : '#ff3333',
                position: 'relative',
                zIndex: 3,
              }}
            >
              {lastFeedback.feedback}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ position: 'relative', zIndex: 3 }}>
          {/* Wave counter */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginBottom: 16,
            fontSize: 12, color: 'rgba(255,100,50,0.7)',
          }}>
            <span>ウェーブ: {waveCount}/{targetWaves}</span>
            <span>生存: {survived}</span>
          </div>

          {/* Lane display */}
          <div style={{
            display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20, padding: '20px 0',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,100,50,0.15)',
          }}>
            {Array.from({ length: laneCount }, (_, i) => {
              const isShip = i === shipPos;
              return (
                <motion.div
                  key={i}
                  animate={{
                    background: isShip ? 'rgba(0,240,255,0.2)' : 'rgba(255,255,255,0.03)',
                    borderColor: isShip ? 'rgba(0,240,255,0.6)' : 'rgba(255,255,255,0.1)',
                  }}
                  style={{
                    width: 60, height: 60,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid',
                    fontSize: isShip ? 28 : 12,
                    color: isShip ? '#00f0ff' : 'rgba(255,255,255,0.2)',
                    textShadow: isShip ? '0 0 12px rgba(0,240,255,0.6)' : 'none',
                    position: 'relative',
                  }}
                >
                  {isShip ? '\u25B2' : i}
                </motion.div>
              );
            })}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleMove('left')}
              style={{
                background: 'linear-gradient(135deg, rgba(255,100,50,0.15), rgba(255,100,50,0.3))',
                border: '1px solid rgba(255,100,50,0.4)',
                color: '#ff6633',
                padding: '12px 28px',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 16,
                cursor: 'pointer',
                letterSpacing: 2,
              }}
            >
              &#9664; A
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleTick}
              style={{
                background: 'linear-gradient(135deg, rgba(255,50,30,0.2), rgba(255,50,30,0.5))',
                border: '2px solid rgba(255,50,30,0.6)',
                color: '#ff4422',
                padding: '12px 32px',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 13,
                cursor: 'pointer',
                letterSpacing: 3,
                textShadow: '0 0 8px rgba(255,68,34,0.4)',
              }}
            >
              次のウェーブ
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleMove('right')}
              style={{
                background: 'linear-gradient(135deg, rgba(255,100,50,0.15), rgba(255,100,50,0.3))',
                border: '1px solid rgba(255,100,50,0.4)',
                color: '#ff6633',
                padding: '12px 28px',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 16,
                cursor: 'pointer',
                letterSpacing: 2,
              }}
            >
              D &#9654;
            </motion.button>
          </div>

          {/* Survival progress bar */}
          <div style={{ marginTop: 20 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 10, color: 'rgba(255,100,50,0.5)', letterSpacing: 1, marginBottom: 4,
            }}>
              <span>生存進捗</span>
              <span>{Math.round((waveCount / targetWaves) * 100)}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,50,30,0.1)', overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${(waveCount / targetWaves) * 100}%` }}
                transition={{ duration: 0.4 }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #ff6633, #ff2211)',
                  boxShadow: '0 0 12px rgba(255,50,30,0.5)',
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

export default function AsteroidDodgePuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
