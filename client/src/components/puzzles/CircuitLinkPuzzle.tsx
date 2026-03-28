// ===== STATIC ORBIT — Circuit Link Puzzle =====

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../hooks/useSocket';
import { useGameStore } from '../../stores/gameStore';

interface PuzzleProps {
  roleData: Record<string, unknown>;
  role: 'observer' | 'operator' | 'navigator' | 'hacker';
}

const WIRE_COLORS: Record<string, string> = {
  red: '#ff3333',
  blue: '#3399ff',
  green: '#33ff66',
  yellow: '#ffee33',
  purple: '#cc33ff',
  orange: '#ff8833',
  cyan: '#00f0ff',
  white: '#ffffff',
};

// --- Shared Styles ---

const containerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 800,
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

// ===== OBSERVER VIEW =====

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const connectionMap = roleData.connectionMap as Array<{ color: string; sourcePort: string; destPort: string }>;

  return (
    <div style={containerStyle}>
      <div style={panelStyle}>
        <div style={scanlineOverlay} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={headerStyle}>
          <div style={{ marginBottom: 4 }}>/// 回路図 ///</div>
          <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.5)', letterSpacing: 2 }}>
            【機密】 オペレーターに伝えてください
          </div>
        </div>

        {/* Schematic Table */}
        <div style={{ position: 'relative', zIndex: 3 }}>
          {/* Column Headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '100px 1fr 100px',
            gap: 8,
            marginBottom: 12,
            padding: '0 8px',
          }}>
            <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.4)', letterSpacing: 2, fontFamily: "'Orbitron', sans-serif" }}>
              入力
            </div>
            <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.4)', letterSpacing: 2, textAlign: 'center', fontFamily: "'Orbitron', sans-serif" }}>
              ワイヤー
            </div>
            <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.4)', letterSpacing: 2, textAlign: 'right', fontFamily: "'Orbitron', sans-serif" }}>
              出力
            </div>
          </div>

          {connectionMap.map((conn, i) => {
            const wireColor = WIRE_COLORS[conn.color] ?? '#888';
            return (
              <motion.div
                key={conn.color}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr 100px',
                  gap: 8,
                  alignItems: 'center',
                  padding: '10px 8px',
                  marginBottom: 4,
                  background: `linear-gradient(90deg, ${wireColor}08, ${wireColor}15, ${wireColor}08)`,
                  borderLeft: `3px solid ${wireColor}`,
                  borderRight: `3px solid ${wireColor}`,
                }}
              >
                {/* Source Port */}
                <div style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 14,
                  color: '#e0e0e0',
                  background: 'rgba(0,0,0,0.4)',
                  padding: '4px 8px',
                  textAlign: 'center',
                  clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
                }}>
                  {conn.sourcePort}
                </div>

                {/* Wire Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 10,
                    height: 10,
                    background: wireColor,
                    borderRadius: 1,
                    boxShadow: `0 0 8px ${wireColor}80`,
                    flexShrink: 0,
                  }} />
                  <div style={{
                    flex: 1,
                    height: 2,
                    background: `linear-gradient(90deg, ${wireColor}, ${wireColor}80, ${wireColor})`,
                    boxShadow: `0 0 4px ${wireColor}60`,
                    position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: 'rgba(0,10,20,0.9)',
                      padding: '2px 10px',
                      fontSize: 11,
                      color: wireColor,
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                    }}>
                      {conn.color}
                    </div>
                  </div>
                  <div style={{
                    width: 0,
                    height: 0,
                    borderTop: '6px solid transparent',
                    borderBottom: '6px solid transparent',
                    borderLeft: `10px solid ${wireColor}`,
                    filter: `drop-shadow(0 0 4px ${wireColor}80)`,
                    flexShrink: 0,
                  }} />
                </div>

                {/* Dest Port */}
                <div style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 14,
                  color: '#e0e0e0',
                  background: 'rgba(0,0,0,0.4)',
                  padding: '4px 8px',
                  textAlign: 'center',
                  clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
                }}>
                  {conn.destPort}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 20,
          padding: '8px 12px',
          background: 'rgba(0,240,255,0.04)',
          border: '1px solid rgba(0,240,255,0.1)',
          fontSize: 10,
          color: 'rgba(0,240,255,0.4)',
          textAlign: 'center',
          letterSpacing: 1,
        }}>
          {connectionMap.length}本のワイヤー接続を検出 -- 口頭で伝達してください
        </div>
      </div>
    </div>
  );
}

// ===== OPERATOR VIEW =====

interface WireAssignment {
  color: string;
  destPort: string | null;
  connected: boolean;
}

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const wireColors = roleData.wireColors as string[];
  const sourcePorts = roleData.sourcePorts as string[];
  const destPorts = roleData.destPorts as string[];
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [assignments, setAssignments] = useState<WireAssignment[]>(
    wireColors.map((color) => ({ color, destPort: null, connected: false }))
  );
  const [selectedDest, setSelectedDest] = useState<Record<number, string>>({});

  // Track the last attempted wire so we know which one to mark on success
  const lastAttemptedWireRef = useRef<{ wireIndex: number; color: string; destPort: string } | null>(null);

  const usedDests = new Set(
    assignments.filter((a) => a.connected).map((a) => a.destPort)
  );

  const handleConnect = useCallback((wireIndex: number) => {
    const dest = selectedDest[wireIndex];
    if (!dest) return;

    const color = wireColors[wireIndex];

    // Track which wire we're attempting (used when feedback arrives)
    lastAttemptedWireRef.current = { wireIndex, color, destPort: dest };

    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'circuit-link',
      action: 'connect-wire',
      data: { color, destPort: dest },
    });

    // Do NOT optimistically mark as connected — wait for server feedback
  }, [selectedDest, wireColors]);

  // Watch lastFeedback to confirm or reject connections
  useEffect(() => {
    if (!lastFeedback) return;
    const attempted = lastAttemptedWireRef.current;
    if (!attempted) return;

    // Check if this is a successful connection
    if (lastFeedback.correct && lastFeedback.feedback && lastFeedback.feedback.includes('接続完了')) {
      setAssignments((prev) =>
        prev.map((a, i) =>
          i === attempted.wireIndex
            ? { ...a, destPort: attempted.destPort, connected: true }
            : a
        )
      );
      // Clear the attempt tracker after successful connection
      lastAttemptedWireRef.current = null;
    } else if (!lastFeedback.correct && lastFeedback.feedback && lastFeedback.feedback !== 'シーケンス開始') {
      // Wrong connection — keep the wire as unconnected and keep the dropdown
      // selection so the operator can see what they tried
      lastAttemptedWireRef.current = null;
    }
  }, [lastFeedback]);

  const handleSelectChange = (wireIndex: number, value: string) => {
    setSelectedDest((prev) => ({ ...prev, [wireIndex]: value }));
  };

  return (
    <div style={containerStyle}>
      <div style={{
        ...panelStyle,
        background: 'linear-gradient(135deg, rgba(10,0,20,0.95) 0%, rgba(20,0,30,0.9) 100%)',
        border: '1px solid rgba(255,0,100,0.25)',
      }}>
        <div style={scanlineOverlay} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={{
          ...headerStyle,
          color: '#ff0066',
          borderBottomColor: 'rgba(255,0,102,0.2)',
        }}>
          <div style={{ marginBottom: 4 }}>/// ワイヤー接続パネル ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,0,102,0.5)', letterSpacing: 2 }}>
            各ワイヤーを正しい出力ポートに接続せよ
          </div>
        </div>

        {/* Feedback Display */}
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

        {/* Wire Assignment Rows */}
        <div style={{ position: 'relative', zIndex: 3 }}>
          {assignments.map((wire, i) => {
            const wireColor = WIRE_COLORS[wire.color] ?? '#888';
            const available = destPorts.filter((d) => !usedDests.has(d) || d === selectedDest[i]);

            return (
              <motion.div
                key={wire.color}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  marginBottom: 6,
                  background: wire.connected
                    ? `linear-gradient(90deg, rgba(51,255,102,0.05), rgba(51,255,102,0.1), rgba(51,255,102,0.05))`
                    : `linear-gradient(90deg, ${wireColor}08, ${wireColor}12, ${wireColor}08)`,
                  borderLeft: wire.connected
                    ? '3px solid #33ff66'
                    : `3px solid ${wireColor}`,
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Wire Color Badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minWidth: 120,
                }}>
                  {/* Hexagonal node */}
                  <div style={{
                    width: 28,
                    height: 28,
                    background: wireColor,
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    boxShadow: `0 0 10px ${wireColor}60`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 12,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: wireColor,
                    fontWeight: 'bold',
                  }}>
                    {wire.color}
                  </span>
                </div>

                {/* Source Port */}
                <div style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 11,
                  color: '#888',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '3px 8px',
                  flexShrink: 0,
                }}>
                  {sourcePorts[i]}
                </div>

                {/* Wire line */}
                <div style={{
                  flex: 1,
                  height: 2,
                  background: wire.connected
                    ? `linear-gradient(90deg, #33ff66, #33ff6680, #33ff66)`
                    : `linear-gradient(90deg, ${wireColor}40, ${wireColor}20, ${wireColor}40)`,
                  position: 'relative',
                }}>
                  {wire.connected && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.5 }}
                      style={{
                        position: 'absolute',
                        top: -1,
                        left: 0,
                        height: 4,
                        background: `linear-gradient(90deg, transparent, #33ff6660, transparent)`,
                      }}
                    />
                  )}
                </div>

                {/* Dest Port Selection or Connected Indicator */}
                {wire.connected ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'tween', duration: 0.2 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      minWidth: 120,
                    }}
                  >
                    <div style={{
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: 12,
                      color: '#33ff66',
                      background: 'rgba(51,255,102,0.1)',
                      padding: '4px 10px',
                      border: '1px solid rgba(51,255,102,0.3)',
                    }}>
                      {wire.destPort}
                    </div>
                    <span style={{ color: '#33ff66', fontSize: 16 }}>&#10003;</span>
                  </motion.div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 200 }}>
                    <select
                      value={selectedDest[i] ?? ''}
                      onChange={(e) => handleSelectChange(i, e.target.value)}
                      style={{
                        background: 'rgba(0,0,0,0.6)',
                        border: `1px solid ${wireColor}40`,
                        color: wireColor,
                        padding: '6px 10px',
                        fontFamily: "'Share Tech Mono', monospace",
                        fontSize: 12,
                        outline: 'none',
                        cursor: 'pointer',
                        minWidth: 90,
                      }}
                    >
                      <option value="" style={{ background: '#0a0a1a' }}>-- ポート --</option>
                      {available.map((d) => (
                        <option key={d} value={d} style={{ background: '#0a0a1a' }}>
                          {d}
                        </option>
                      ))}
                    </select>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleConnect(i)}
                      disabled={!selectedDest[i]}
                      style={{
                        background: selectedDest[i]
                          ? `linear-gradient(135deg, ${wireColor}30, ${wireColor}50)`
                          : 'rgba(60,60,60,0.3)',
                        border: `1px solid ${selectedDest[i] ? wireColor : '#333'}`,
                        color: selectedDest[i] ? wireColor : '#555',
                        padding: '5px 14px',
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: 10,
                        letterSpacing: 2,
                        cursor: selectedDest[i] ? 'pointer' : 'default',
                        clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
                      }}
                    >
                      接続
                    </motion.button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div style={{ marginTop: 20, position: 'relative', zIndex: 3 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: 'rgba(255,0,102,0.4)',
            letterSpacing: 1,
            marginBottom: 6,
          }}>
            <span>接続数</span>
            <span>{assignments.filter((a) => a.connected).length} / {assignments.length}</span>
          </div>
          <div style={{
            height: 4,
            background: 'rgba(255,0,102,0.1)',
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <motion.div
              animate={{
                width: `${(assignments.filter((a) => a.connected).length / assignments.length) * 100}%`,
              }}
              transition={{ duration: 0.5 }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #ff0066, #00f0ff)',
                borderRadius: 2,
                boxShadow: '0 0 8px rgba(255,0,102,0.4)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN COMPONENT =====

export default function CircuitLinkPuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
