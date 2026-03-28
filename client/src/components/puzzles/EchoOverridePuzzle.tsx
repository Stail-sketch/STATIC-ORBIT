// ===== STATIC ORBIT — Echo Override Boss Puzzle =====

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../hooks/useSocket';
import { useGameStore } from '../../stores/gameStore';

interface PuzzleProps {
  roleData: Record<string, unknown>;
  role: 'observer' | 'operator' | 'navigator' | 'hacker';
}

interface CodeLineData {
  index: number;
  text: string;
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
  background: 'linear-gradient(135deg, rgba(12,5,15,0.97) 0%, rgba(20,8,25,0.95) 100%)',
  border: '1px solid rgba(180,80,255,0.25)',
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
  color: '#bb66ff',
  textAlign: 'center' as const,
  marginBottom: 24,
  paddingBottom: 12,
  borderBottom: '1px solid rgba(180,80,255,0.25)',
};

const scanlineOverlay: React.CSSProperties = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(180,80,255,0.008) 2px, rgba(180,80,255,0.008) 4px)',
  pointerEvents: 'none',
  zIndex: 1,
};

const gridOverlay: React.CSSProperties = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundImage:
    'linear-gradient(rgba(180,80,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(180,80,255,0.02) 1px, transparent 1px)',
  backgroundSize: '20px 20px',
  pointerEvents: 'none',
  zIndex: 0,
};

const cornerDecor = (position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 12, height: 12,
    borderColor: 'rgba(180,80,255,0.5)',
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
  const pattern = roleData.pattern as string;
  const hint = roleData.hint as string;
  const validIndices = roleData.validIndices as number[];

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
          <div style={{ marginBottom: 4 }}>/// エコーオーバーライド ///</div>
          <div style={{ fontSize: 10, color: 'rgba(180,80,255,0.5)', letterSpacing: 2 }}>
            パターン情報をオペレーターに伝えてください
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 3 }}>
          {/* Pattern hint */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '18px 24px',
              marginBottom: 20,
              background: 'rgba(180,80,255,0.06)',
              borderLeft: '3px solid rgba(180,80,255,0.5)',
              textAlign: 'center',
            }}
          >
            <div style={{
              fontSize: 10, color: 'rgba(180,80,255,0.5)',
              letterSpacing: 2, marginBottom: 10,
              fontFamily: "'Orbitron', sans-serif",
            }}>
              検索パターン
            </div>
            <div style={{
              fontSize: 24, color: '#bb66ff',
              textShadow: '0 0 12px rgba(180,80,255,0.5)',
              letterSpacing: 4,
            }}>
              {hint}
            </div>
          </motion.div>

          {/* Valid line indices */}
          <div style={{
            padding: '16px 20px',
            background: 'rgba(0,240,255,0.04)',
            border: '1px solid rgba(0,240,255,0.15)',
          }}>
            <div style={{
              fontSize: 10, color: 'rgba(0,240,255,0.5)',
              letterSpacing: 2, marginBottom: 10,
              fontFamily: "'Orbitron', sans-serif",
            }}>
              有効行インデックス ({validIndices.length}行)
            </div>
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 8,
            }}>
              {validIndices.map((idx, i) => (
                <motion.span
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  style={{
                    padding: '4px 10px',
                    background: 'rgba(0,240,255,0.1)',
                    border: '1px solid rgba(0,240,255,0.3)',
                    color: '#00f0ff',
                    fontSize: 13,
                    fontFamily: "'Share Tech Mono', monospace",
                    letterSpacing: 1,
                  }}
                >
                  L{String(idx).padStart(2, '0')}
                </motion.span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -- Operator View ------------------------------------------------ */

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const codeLines = roleData.codeLines as CodeLineData[];
  const target = roleData.target as number;
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [selectedLines, setSelectedLines] = useState<Set<number>>(() => new Set());
  const [score, setScore] = useState(0);

  const prevFeedback = useRef(lastFeedback);
  useEffect(() => {
    if (lastFeedback && lastFeedback !== prevFeedback.current) {
      const match = lastFeedback.feedback?.match(/\((-?\d+)\/(\d+)\)/);
      if (match) setScore(parseInt(match[1], 10));
    }
    prevFeedback.current = lastFeedback;
  }, [lastFeedback]);

  const handleLineClick = useCallback((lineIndex: number) => {
    if (selectedLines.has(lineIndex)) return;
    setSelectedLines(prev => new Set(prev).add(lineIndex));
    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'echo-override',
      action: 'select-line',
      data: { lineIndex },
    });
  }, [selectedLines]);

  return (
    <div style={containerStyle}>
      <div style={{
        ...bossPanelStyle,
        border: '1px solid rgba(180,80,255,0.35)',
      }}>
        <div style={scanlineOverlay} />
        <div style={gridOverlay} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={{
          ...bossHeaderStyle,
          color: '#cc44ff',
          borderBottomColor: 'rgba(200,60,255,0.25)',
        }}>
          <div style={{ marginBottom: 4 }}>/// エコーオーバーライド ///</div>
          <div style={{ fontSize: 10, color: 'rgba(200,60,255,0.5)', letterSpacing: 2 }}>
            指示されたパターンを含む行を選択せよ
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
          {/* Score */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginBottom: 12,
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, color: 'rgba(180,80,255,0.5)', letterSpacing: 1 }}>
              コード行を選択
            </span>
            <div style={{
              fontSize: 20, fontWeight: 'bold',
              color: score >= target ? '#33ff66' : '#bb66ff',
              textShadow: `0 0 8px ${score >= target ? 'rgba(51,255,102,0.4)' : 'rgba(180,80,255,0.4)'}`,
              fontFamily: "'Share Tech Mono', monospace",
              letterSpacing: 3,
            }}>
              {score} / {target}
            </div>
          </div>

          {/* Terminal-style code list */}
          <div style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(180,80,255,0.15)',
            padding: '4px 0',
            maxHeight: 340,
            overflowY: 'auto',
            fontFamily: "'Share Tech Mono', 'Courier New', monospace",
          }}>
            {codeLines.map((line) => {
              const isSelected = selectedLines.has(line.index);
              return (
                <motion.div
                  key={line.index}
                  whileHover={!isSelected ? { background: 'rgba(180,80,255,0.08)' } : {}}
                  onClick={() => handleLineClick(line.index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '5px 12px',
                    cursor: isSelected ? 'default' : 'pointer',
                    background: isSelected ? 'rgba(0,240,255,0.1)' : 'transparent',
                    borderLeft: isSelected ? '2px solid #00f0ff' : '2px solid transparent',
                    transition: 'background 0.1s',
                  }}
                >
                  <span style={{
                    width: 36, fontSize: 10,
                    color: isSelected ? '#00f0ff' : 'rgba(255,255,255,0.2)',
                    fontFamily: "'Share Tech Mono', monospace",
                  }}>
                    {String(line.index).padStart(2, '0')}
                  </span>
                  <span style={{
                    fontSize: 12,
                    color: isSelected ? '#00f0ff' : 'rgba(255,255,255,0.55)',
                    textShadow: isSelected ? '0 0 6px rgba(0,240,255,0.3)' : 'none',
                    letterSpacing: 0.5,
                  }}>
                    {line.text}
                  </span>
                  {isSelected && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{
                        marginLeft: 'auto',
                        fontSize: 11,
                        color: '#00f0ff',
                        letterSpacing: 1,
                      }}
                    >
                      &#10003;
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: 16 }}>
            <div style={{ height: 4, background: 'rgba(180,80,255,0.1)', overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${Math.max(0, (score / target) * 100)}%` }}
                transition={{ duration: 0.3 }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #bb66ff, #00f0ff)',
                  boxShadow: '0 0 8px rgba(180,80,255,0.4)',
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

export default function EchoOverridePuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
