// ===== STATIC ORBIT — Reflex Burst Puzzle =====

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../hooks/useSocket';
import { useGameStore } from '../../stores/gameStore';

interface PuzzleProps {
  roleData: Record<string, unknown>;
  role: 'observer' | 'operator' | 'navigator' | 'hacker';
}

/* ── Shared Styles ─────────────────────────────────────────── */

const containerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 820,
  margin: '0 auto',
  fontFamily: "'Share Tech Mono', 'Courier New', monospace",
  color: '#e0e0e0',
};

const panelStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(0,10,20,0.95) 0%, rgba(0,20,40,0.9) 100%)',
  border: '1px solid rgba(0,240,255,0.25)',
  borderRadius: 2,
  padding: 24,
  position: 'relative',
  overflow: 'hidden',
};

const operatorPanelStyle: React.CSSProperties = {
  ...panelStyle,
  background: 'linear-gradient(135deg, rgba(10,0,20,0.95) 0%, rgba(20,0,30,0.9) 100%)',
  border: '1px solid rgba(255,0,100,0.25)',
};

const headerStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', sans-serif",
  fontSize: 14,
  letterSpacing: 3,
  textTransform: 'uppercase' as const,
  color: '#00f0ff',
  textAlign: 'center' as const,
  marginBottom: 24,
  paddingBottom: 12,
  borderBottom: '1px solid rgba(0,240,255,0.2)',
};

const scanlineOverlay: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.015) 2px, rgba(0,240,255,0.015) 4px)',
  pointerEvents: 'none',
  zIndex: 1,
};

const gridOverlay: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundImage:
    'linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)',
  backgroundSize: '20px 20px',
  pointerEvents: 'none',
  zIndex: 0,
};

const cornerDecor = (position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 12,
    height: 12,
    borderColor: 'rgba(0,240,255,0.5)',
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

/* ── Key color mapping ─────────────────────────────────────── */

const KEY_COLORS: Record<string, string> = {
  W: '#00f0ff',
  A: '#ff0066',
  S: '#33ff66',
  D: '#ffaa00',
  J: '#aa66ff',
  K: '#ff6633',
  L: '#66ffcc',
};

/* ── Observer View ─────────────────────────────────────────── */

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const sequence = roleData.sequence as Array<{
    key: string;
    isFake: boolean;
    beatIndex: number;
  }>;
  const tempo = roleData.tempo as number;
  const totalBeats = roleData.totalBeats as number;
  const bpm = Math.round(60000 / tempo);

  return (
    <div style={containerStyle}>
      <div style={panelStyle}>
        <div style={scanlineOverlay} />
        <div style={gridOverlay} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={headerStyle}>
          <div style={{ marginBottom: 4 }}>/// バイパスシーケンス -- キーを読み上げよ ///</div>
          <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.5)', letterSpacing: 2 }}>
            テンポ: {bpm} BPM -- {totalBeats}ビート
          </div>
        </div>

        {/* Sequence timeline */}
        <div style={{
          position: 'relative',
          zIndex: 3,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'center',
        }}>
          {sequence.map((cmd, i) => {
            const color = KEY_COLORS[cmd.key] || '#ffffff';

            return (
              <motion.div
                key={cmd.beatIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '10px 14px',
                  background: cmd.isFake
                    ? 'rgba(255,34,68,0.08)'
                    : 'rgba(0,240,255,0.06)',
                  border: `1px solid ${cmd.isFake ? 'rgba(255,34,68,0.3)' : 'rgba(0,240,255,0.2)'}`,
                  clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                  minWidth: 50,
                  position: 'relative',
                }}
              >
                {/* Beat number */}
                <span style={{
                  fontSize: 8,
                  color: 'rgba(0,240,255,0.4)',
                  letterSpacing: 1,
                  fontFamily: "'Orbitron', sans-serif",
                }}>
                  #{cmd.beatIndex + 1}
                </span>

                {/* Key badge */}
                <span style={{
                  fontSize: 22,
                  fontWeight: 'bold',
                  color: cmd.isFake ? 'rgba(255,34,68,0.4)' : color,
                  textShadow: cmd.isFake ? 'none' : `0 0 8px ${color}80`,
                  textDecoration: cmd.isFake ? 'line-through' : 'none',
                  fontFamily: "'Orbitron', sans-serif",
                }}>
                  {cmd.key}
                </span>

                {/* Fake label */}
                {cmd.isFake && (
                  <span style={{
                    fontSize: 7,
                    letterSpacing: 2,
                    color: '#ff2244',
                    fontFamily: "'Orbitron', sans-serif",
                    background: 'rgba(255,34,68,0.15)',
                    padding: '1px 6px',
                  }}>
                    フェイク
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Footer with real count */}
        <div style={{
          marginTop: 20,
          padding: '8px 12px',
          background: 'rgba(0,240,255,0.04)',
          border: '1px solid rgba(0,240,255,0.1)',
          fontSize: 10,
          color: 'rgba(0,240,255,0.4)',
          textAlign: 'center',
          letterSpacing: 1,
          position: 'relative',
          zIndex: 3,
        }}>
          本物{sequence.filter(s => !s.isFake).length}個 -- フェイク{sequence.filter(s => s.isFake).length}個 -- 順番を正確に伝えてください
        </div>
      </div>
    </div>
  );
}

/* ── Operator View ─────────────────────────────────────────── */

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const tempo = roleData.tempo as number;
  const totalBeats = roleData.totalBeats as number;
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [currentBeat, setCurrentBeat] = useState(0);
  const [beatResults, setBeatResults] = useState<Map<number, 'hit' | 'miss'>>(new Map());
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [pulsePhase, setPulsePhase] = useState(0);
  const beatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const AVAILABLE_KEYS = ['W', 'A', 'S', 'D', 'J', 'K', 'L'];

  // Beat timer
  useEffect(() => {
    beatTimerRef.current = setInterval(() => {
      setCurrentBeat((b) => {
        if (b >= totalBeats - 1) return b;
        return b + 1;
      });
      setPulsePhase((p) => p + 1);
    }, tempo);

    return () => {
      if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    };
  }, [tempo, totalBeats]);

  const handlePress = useCallback((key: string) => {
    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'reflex-burst',
      action: 'press',
      data: { key: key.toUpperCase(), beatIndex: currentBeat },
    });
    setPressedKey(key);
    setTimeout(() => setPressedKey(null), 200);
  }, [currentBeat]);

  // Track feedback to update beat results
  useEffect(() => {
    if (lastFeedback) {
      setBeatResults((prev) => {
        const next = new Map(prev);
        next.set(currentBeat, lastFeedback.correct ? 'hit' : 'miss');
        return next;
      });
    }
  }, [lastFeedback]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      const key = e.key.toUpperCase();
      if (AVAILABLE_KEYS.includes(key)) {
        e.preventDefault();
        handlePress(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePress]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={containerStyle}>
      <div style={operatorPanelStyle}>
        <div style={scanlineOverlay} />
        <div style={gridOverlay} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={{
          ...headerStyle,
          color: '#ff0066',
          borderBottomColor: 'rgba(255,0,102,0.2)',
        }}>
          <div style={{ marginBottom: 4 }}>/// リフレックスバイパス ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,0,102,0.5)', letterSpacing: 2 }}>
            ビートに合わせてキーを押せ
          </div>
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {lastFeedback && (
            <motion.div
              key={lastFeedback.feedback}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              style={{
                padding: '8px 16px',
                marginBottom: 16,
                textAlign: 'center',
                fontSize: 12,
                letterSpacing: 1,
                background: lastFeedback.correct
                  ? 'rgba(51,255,102,0.1)'
                  : 'rgba(255,51,51,0.1)',
                border: `1px solid ${lastFeedback.correct ? 'rgba(51,255,102,0.3)' : 'rgba(255,51,51,0.3)'}`,
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
          {/* Beat timeline */}
          <div style={{
            display: 'flex',
            gap: 3,
            justifyContent: 'center',
            marginBottom: 24,
            flexWrap: 'wrap',
          }}>
            {Array.from({ length: totalBeats }, (_, i) => {
              const result = beatResults.get(i);
              const isCurrent = i === currentBeat;
              return (
                <div
                  key={i}
                  style={{
                    width: 16,
                    height: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 7,
                    fontFamily: "'Orbitron', sans-serif",
                    background: isCurrent
                      ? 'rgba(255,0,102,0.4)'
                      : result === 'hit'
                        ? 'rgba(51,255,102,0.3)'
                        : result === 'miss'
                          ? 'rgba(255,34,68,0.3)'
                          : 'rgba(255,255,255,0.05)',
                    border: isCurrent
                      ? '1px solid #ff0066'
                      : result === 'hit'
                        ? '1px solid rgba(51,255,102,0.5)'
                        : result === 'miss'
                          ? '1px solid rgba(255,34,68,0.5)'
                          : '1px solid rgba(255,255,255,0.1)',
                    color: isCurrent ? '#ff0066' : 'rgba(255,255,255,0.3)',
                    boxShadow: isCurrent ? '0 0 8px rgba(255,0,102,0.5)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {i + 1}
                </div>
              );
            })}
          </div>

          {/* Rhythm indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <motion.div
              animate={{
                scale: pulsePhase % 2 === 0 ? [1, 1.4, 1] : [1, 0.8, 1],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{ duration: tempo / 1000, repeat: Infinity }}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'rgba(255,0,102,0.3)',
                border: '2px solid #ff0066',
                boxShadow: '0 0 16px rgba(255,0,102,0.5)',
              }}
            />
            <span style={{
              marginLeft: 12,
              fontSize: 18,
              fontFamily: "'Orbitron', sans-serif",
              color: '#ff0066',
              textShadow: '0 0 10px rgba(255,0,102,0.5)',
              alignSelf: 'center',
            }}>
              BEAT {currentBeat + 1} / {totalBeats}
            </span>
          </div>

          {/* Current beat indicator */}
          <div style={{
            textAlign: 'center',
            marginBottom: 24,
            fontSize: 13,
            color: 'rgba(255,0,102,0.6)',
            letterSpacing: 2,
            fontFamily: "'Orbitron', sans-serif",
          }}>
            チームが読み上げたキーを押せ
          </div>

          {/* Key buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}>
            {AVAILABLE_KEYS.map((key) => {
              const color = KEY_COLORS[key] || '#ffffff';
              const isPressed = pressedKey === key;

              return (
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  animate={isPressed ? {
                    boxShadow: [`0 0 4px ${color}40`, `0 0 24px ${color}`, `0 0 4px ${color}40`],
                  } : {}}
                  transition={{ duration: 0.2 }}
                  onClick={() => handlePress(key)}
                  style={{
                    width: 68,
                    height: 68,
                    background: isPressed
                      ? `linear-gradient(135deg, ${color}40, ${color}20)`
                      : `linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.08))`,
                    border: `2px solid ${isPressed ? color : `${color}50`}`,
                    borderRadius: 4,
                    color: isPressed ? '#ffffff' : color,
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: 22,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    textShadow: isPressed ? `0 0 12px ${color}` : 'none',
                    transition: 'background 0.1s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {key}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginTop: 24, position: 'relative', zIndex: 3 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: 'rgba(255,0,102,0.4)',
            letterSpacing: 1,
            marginBottom: 6,
          }}>
            <span>シーケンス進捗</span>
            <span>{currentBeat + 1} / {totalBeats}</span>
          </div>
          <div style={{
            height: 4,
            background: 'rgba(255,0,102,0.1)',
            overflow: 'hidden',
          }}>
            <motion.div
              animate={{ width: `${((currentBeat + 1) / totalBeats) * 100}%` }}
              transition={{ duration: 0.3 }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #ff0066, #ffaa00)',
                boxShadow: '0 0 8px rgba(255,0,102,0.4)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */

export default function ReflexBurstPuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
