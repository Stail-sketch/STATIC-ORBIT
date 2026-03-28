// ===== STATIC ORBIT — Airlock Sync Puzzle =====

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
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.015) 2px, rgba(0,240,255,0.015) 4px)',
  pointerEvents: 'none',
  zIndex: 1,
};

const gridOverlay: React.CSSProperties = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundImage:
    'linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)',
  backgroundSize: '20px 20px',
  pointerEvents: 'none',
  zIndex: 0,
};

const cornerDecor = (position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 12, height: 12,
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

const SPEED_MS: Record<string, number> = {
  slow: 3000,
  medium: 2000,
  fast: 1200,
};

const SPEED_JP: Record<string, string> = {
  slow: '低速',
  medium: '中速',
  fast: '高速',
};

/* ── Observer View ─────────────────────────────────────────── */

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const gauges = roleData.gauges as Array<{
    index: number;
    speed: string;
    greenZoneStart: number;
    greenZoneEnd: number;
  }>;

  const [phases, setPhases] = useState<number[]>(() => Array(gauges.length).fill(0));
  const animRef = useRef<number>(0);
  const startTime = useRef<number>(Date.now());

  // Animate gauges using requestAnimationFrame (same oscillation as operator)
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime.current;
      const newPhases = gauges.map(g => {
        const period = SPEED_MS[g.speed] || 2000;
        const t = (elapsed % period) / period;
        return t < 0.5 ? t * 2 : 2 - t * 2;
      });
      setPhases(newPhases);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [gauges]);

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
          <div style={{ marginBottom: 4 }}>/// エアロック同期 タイミングデータ ///</div>
          <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.5)', letterSpacing: 2 }}>
            グリーンゾーン範囲をオペレーターに伝えてください
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 3 }}>
          {gauges.map((g, i) => {
            const phase = phases[i] || 0;
            const inGreen = phase >= g.greenZoneStart && phase <= g.greenZoneEnd;

            return (
              <motion.div
                key={g.index}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                style={{
                  padding: '14px 16px',
                  marginBottom: 10,
                  background: 'linear-gradient(90deg, rgba(0,240,255,0.04), rgba(0,240,255,0.08), rgba(0,240,255,0.04))',
                  borderLeft: '3px solid rgba(0,240,255,0.6)',
                  clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 10,
                }}>
                  <span style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: 11, letterSpacing: 2,
                    color: 'rgba(0,240,255,0.5)',
                  }}>
                    ゲージ {g.index + 1}
                  </span>
                  <span style={{
                    fontSize: 10, color: 'rgba(255,255,255,0.3)',
                    letterSpacing: 1,
                  }}>
                    {SPEED_JP[g.speed] || g.speed}
                  </span>
                </div>

                {/* Visual gauge bar with green zone and moving indicator */}
                <div style={{
                  position: 'relative',
                  height: 28,
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(0,240,255,0.15)',
                  marginBottom: 10,
                  overflow: 'hidden',
                }}>
                  {/* Tick marks */}
                  {Array.from({ length: 11 }, (_, t) => (
                    <div key={t} style={{
                      position: 'absolute',
                      left: `${t * 10}%`,
                      top: 0, bottom: 0,
                      width: 1,
                      background: 'rgba(255,255,255,0.06)',
                    }} />
                  ))}

                  {/* Green zone highlight */}
                  <div style={{
                    position: 'absolute',
                    left: `${g.greenZoneStart * 100}%`,
                    width: `${(g.greenZoneEnd - g.greenZoneStart) * 100}%`,
                    top: 0, bottom: 0,
                    background: inGreen ? 'rgba(51,255,102,0.35)' : 'rgba(51,255,102,0.15)',
                    border: `1px solid ${inGreen ? 'rgba(51,255,102,0.7)' : 'rgba(51,255,102,0.3)'}`,
                    boxShadow: inGreen ? '0 0 12px rgba(51,255,102,0.4), inset 0 0 8px rgba(51,255,102,0.2)' : 'none',
                    transition: 'background 0.1s, border-color 0.1s, box-shadow 0.1s',
                  }} />

                  {/* Moving indicator line */}
                  <div style={{
                    position: 'absolute',
                    left: `${phase * 100}%`,
                    top: 2, bottom: 2,
                    width: 4,
                    background: inGreen ? '#33ff66' : '#00f0ff',
                    boxShadow: inGreen
                      ? '0 0 12px rgba(51,255,102,0.9), 0 0 24px rgba(51,255,102,0.4)'
                      : '0 0 8px rgba(0,240,255,0.6), 0 0 16px rgba(0,240,255,0.2)',
                    transform: 'translateX(-50%)',
                    transition: 'none',
                  }} />

                  {/* Triangle indicator above the bar */}
                  <div style={{
                    position: 'absolute',
                    left: `${phase * 100}%`,
                    top: -1,
                    width: 0, height: 0,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: `6px solid ${inGreen ? '#33ff66' : '#00f0ff'}`,
                    transform: 'translateX(-50%)',
                    filter: inGreen ? 'drop-shadow(0 0 4px rgba(51,255,102,0.8))' : 'none',
                    transition: 'none',
                  }} />
                </div>

                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
                  <div>
                    <span style={{ color: 'rgba(51,255,102,0.6)', fontSize: 10 }}>グリーンゾーン: </span>
                    <span style={{ color: '#33ff66', fontWeight: 'bold', fontSize: 18 }}>
                      {g.greenZoneStart.toFixed(2)} - {g.greenZoneEnd.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(0,240,255,0.5)', fontSize: 10 }}>位相: </span>
                    <span style={{ color: '#00f0ff' }}>{phase.toFixed(2)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

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
          {gauges.length}個のゲージ -- グリーンゾーンの位置を口頭で伝達してください
        </div>
      </div>
    </div>
  );
}

/* ── Operator View — Animated Gauges ──────────────────────── */

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const gaugeCount = roleData.gaugeCount as number;
  const gauges = roleData.gauges as Array<{ index: number; speed: string }>;
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [phases, setPhases] = useState<number[]>(() => Array(gaugeCount).fill(0));
  const animRef = useRef<number>(0);
  const startTime = useRef<number>(Date.now());

  // Animate gauges using requestAnimationFrame
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime.current;
      const newPhases = gauges.map(g => {
        const period = SPEED_MS[g.speed] || 2000;
        // Oscillate between 0 and 1 using a triangle wave
        const t = (elapsed % period) / period;
        return t < 0.5 ? t * 2 : 2 - t * 2;
      });
      setPhases(newPhases);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [gauges]);

  const handleSync = useCallback(() => {
    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'airlock-sync',
      action: 'sync-press',
      data: { phases: phases.map(p => Math.round(p * 100) / 100) },
    });
  }, [phases]);

  return (
    <div style={containerStyle}>
      <div style={operatorPanelStyle}>
        <div style={scanlineOverlay} />
        <div style={gridOverlay} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={{ ...headerStyle, color: '#ff0066', borderBottomColor: 'rgba(255,0,102,0.2)' }}>
          <div style={{ marginBottom: 4 }}>/// エアロック同期 ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,0,102,0.5)', letterSpacing: 2 }}>
            全ゲージがグリーンゾーンに入った瞬間に同期ボタンを押せ
          </div>
        </div>

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
                background: lastFeedback.correct ? 'rgba(51,255,102,0.1)' : 'rgba(255,51,51,0.1)',
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
          {gauges.map((g, i) => {
            const phase = phases[i] || 0;
            return (
              <motion.div
                key={g.index}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                style={{
                  padding: '12px 16px',
                  marginBottom: 12,
                  background: 'linear-gradient(90deg, rgba(255,0,102,0.04), rgba(255,0,102,0.08), rgba(255,0,102,0.04))',
                  borderLeft: '3px solid rgba(255,0,102,0.5)',
                  clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 8,
                }}>
                  <span style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: 11, letterSpacing: 2,
                    color: 'rgba(255,0,102,0.6)',
                  }}>
                    ゲージ {g.index + 1}
                  </span>
                  <span style={{
                    fontSize: 10, color: 'rgba(255,255,255,0.3)',
                    letterSpacing: 1,
                  }}>
                    {SPEED_JP[g.speed] || g.speed}
                  </span>
                </div>

                {/* Gauge bar */}
                <div style={{
                  position: 'relative',
                  height: 32,
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,0,102,0.2)',
                  overflow: 'hidden',
                }}>
                  {/* Tick marks */}
                  {Array.from({ length: 11 }, (_, t) => (
                    <div key={t} style={{
                      position: 'absolute',
                      left: `${t * 10}%`,
                      top: 0, bottom: 0,
                      width: 1,
                      background: 'rgba(255,255,255,0.06)',
                    }} />
                  ))}

                  {/* Indicator (moving bar) */}
                  <div style={{
                    position: 'absolute',
                    left: `${phase * 100}%`,
                    top: 2, bottom: 2,
                    width: 4,
                    background: '#ff0066',
                    boxShadow: '0 0 12px rgba(255,0,102,0.8), 0 0 24px rgba(255,0,102,0.3)',
                    transform: 'translateX(-50%)',
                    transition: 'none',
                  }} />
                </div>

                {/* Phase readout */}
                <div style={{
                  textAlign: 'right', marginTop: 4,
                  fontSize: 11, color: 'rgba(255,0,102,0.5)',
                  fontFamily: "'Share Tech Mono', monospace",
                }}>
                  位相: {phase.toFixed(2)}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Sync Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, position: 'relative', zIndex: 3 }}>
          <motion.button
            whileHover={{ scale: 1.08, boxShadow: '0 0 30px rgba(255,0,102,0.5)' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSync}
            style={{
              background: 'linear-gradient(135deg, rgba(255,0,102,0.4), rgba(255,0,102,0.6))',
              border: '2px solid rgba(255,0,102,0.7)',
              color: '#fff',
              padding: '16px 56px',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 18,
              letterSpacing: 6,
              cursor: 'pointer',
              clipPath: 'polygon(16px 0, 100% 0, calc(100% - 16px) 100%, 0 100%)',
              textShadow: '0 0 12px rgba(255,0,102,0.6)',
              boxShadow: '0 0 20px rgba(255,0,102,0.3)',
            }}
          >
            同期
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */

export default function AirlockSyncPuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
