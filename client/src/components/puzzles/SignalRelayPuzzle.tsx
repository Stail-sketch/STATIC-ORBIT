// ===== STATIC ORBIT — Signal Relay Puzzle =====

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

const WAVE_TYPE_JP: Record<string, string> = {
  sine: 'サイン波',
  square: '矩形波',
  triangle: '三角波',
  sawtooth: 'ノコギリ波',
};

/* ── Observer View ─────────────────────────────────────────── */

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const targets = roleData.targets as Array<{
    index: number;
    waveType: string;
    frequency: number;
    amplitude: number;
  }>;

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
          <div style={{ marginBottom: 4 }}>/// 信号リレー ターゲット ///</div>
          <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.5)', letterSpacing: 2 }}>
            オペレーターに波形情報を伝えてください
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 3 }}>
          {targets.map((t, i) => (
            <motion.div
              key={t.index}
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
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 11,
                letterSpacing: 2,
                color: 'rgba(0,240,255,0.5)',
                marginBottom: 8,
              }}>
                波形 {t.index + 1}
              </div>

              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{
                  padding: '6px 14px',
                  background: 'rgba(0,240,255,0.08)',
                  border: '1px solid rgba(0,240,255,0.2)',
                  color: '#00f0ff',
                  fontSize: 16,
                  fontWeight: 'bold',
                  textShadow: '0 0 8px rgba(0,240,255,0.4)',
                }}>
                  {WAVE_TYPE_JP[t.waveType] || t.waveType}
                </div>

                <div style={{ fontSize: 14, color: '#e0e0e0' }}>
                  <span style={{ color: 'rgba(0,240,255,0.6)', fontSize: 11 }}>周波数: </span>
                  <span style={{ color: '#00f0ff', fontWeight: 'bold', fontSize: 22, letterSpacing: 2 }}>
                    {t.frequency}
                  </span>
                </div>

                <div style={{ fontSize: 14, color: '#e0e0e0' }}>
                  <span style={{ color: 'rgba(0,240,255,0.6)', fontSize: 11 }}>振幅: </span>
                  <span style={{ color: '#00f0ff', fontWeight: 'bold', fontSize: 22, letterSpacing: 2 }}>
                    {t.amplitude}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
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
          {targets.length}個の波形ターゲットを検出 -- 口頭で伝達してください
        </div>
      </div>
    </div>
  );
}

/* ── Operator View ─────────────────────────────────────────── */

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const waveCount = roleData.waveCount as number;
  const availableTypes = roleData.availableTypes as string[];
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [waves, setWaves] = useState(() =>
    Array.from({ length: waveCount }, () => ({
      waveType: 'sine' as string,
      frequency: 5,
      amplitude: 0.5,
    }))
  );
  const [lockedWaves, setLockedWaves] = useState<Set<number>>(() => new Set());

  const prevFeedback = useRef(lastFeedback);
  useEffect(() => {
    if (lastFeedback && lastFeedback !== prevFeedback.current && lastFeedback.correct) {
      const match = lastFeedback.feedback?.match(/波形(\d+)をマッチ/);
      if (match) {
        const idx = parseInt(match[1], 10) - 1;
        setLockedWaves(prev => new Set(prev).add(idx));
      }
    }
    prevFeedback.current = lastFeedback;
  }, [lastFeedback]);

  const updateWave = useCallback((index: number, field: string, value: string | number) => {
    if (lockedWaves.has(index)) return;
    setWaves(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, [lockedWaves]);

  const handleLock = useCallback((index: number) => {
    if (lockedWaves.has(index)) return;
    const socket = getSocket();
    const w = waves[index];
    socket.emit('game:action', {
      puzzleId: 'signal-relay',
      action: 'match-wave',
      data: {
        index,
        waveType: w.waveType,
        frequency: w.frequency,
        amplitude: w.amplitude,
      },
    });
  }, [waves, lockedWaves]);

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
          <div style={{ marginBottom: 4 }}>/// 信号リレー 波形マッチング ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,0,102,0.5)', letterSpacing: 2 }}>
            各波形のパラメータを設定してロックせよ
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
          {waves.map((w, i) => {
            const locked = lockedWaves.has(i);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                style={{
                  padding: 16,
                  marginBottom: 10,
                  background: locked
                    ? 'linear-gradient(90deg, rgba(51,255,102,0.04), rgba(51,255,102,0.08), rgba(51,255,102,0.04))'
                    : 'linear-gradient(90deg, rgba(255,0,102,0.04), rgba(255,0,102,0.08), rgba(255,0,102,0.04))',
                  borderLeft: locked ? '3px solid #33ff66' : '3px solid rgba(255,0,102,0.5)',
                  clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
                }}>
                  <span style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: 11, letterSpacing: 2,
                    color: locked ? '#33ff66' : 'rgba(255,0,102,0.6)',
                  }}>
                    波形 {i + 1}
                  </span>
                  {locked && (
                    <span style={{ color: '#33ff66', fontSize: 12 }}>&#10003; マッチ済</span>
                  )}
                </div>

                {/* Wave Type Dropdown */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ flex: '1 1 180px' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, letterSpacing: 1 }}>
                      波形タイプ
                    </div>
                    <select
                      value={w.waveType}
                      onChange={(e) => updateWave(i, 'waveType', e.target.value)}
                      disabled={locked}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0,0,0,0.6)',
                        border: '1px solid rgba(255,0,102,0.3)',
                        color: locked ? '#33ff66' : '#ff0066',
                        fontFamily: "'Share Tech Mono', monospace",
                        fontSize: 14,
                        cursor: locked ? 'default' : 'pointer',
                        outline: 'none',
                      }}
                    >
                      {availableTypes.map(t => (
                        <option key={t} value={t}>{WAVE_TYPE_JP[t] || t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Frequency Slider */}
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, letterSpacing: 1 }}>
                      周波数: <span style={{ color: locked ? '#33ff66' : '#ff0066', fontSize: 16 }}>{w.frequency}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>1</span>
                      <input
                        type="range"
                        min={1} max={10} step={1}
                        value={w.frequency}
                        onChange={(e) => updateWave(i, 'frequency', Number(e.target.value))}
                        disabled={locked}
                        style={{
                          flex: 1, height: 6,
                          appearance: 'none', WebkitAppearance: 'none',
                          background: locked
                            ? 'linear-gradient(90deg, rgba(51,255,102,0.2), rgba(51,255,102,0.4))'
                            : 'linear-gradient(90deg, rgba(255,0,102,0.2), rgba(255,0,102,0.5))',
                          borderRadius: 0, outline: 'none',
                          cursor: locked ? 'default' : 'pointer',
                          accentColor: locked ? '#33ff66' : '#ff0066',
                        }}
                      />
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>10</span>
                    </div>
                  </div>

                  {/* Amplitude Slider */}
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, letterSpacing: 1 }}>
                      振幅: <span style={{ color: locked ? '#33ff66' : '#ff0066', fontSize: 16 }}>{w.amplitude.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>0.0</span>
                      <input
                        type="range"
                        min={0} max={1} step={0.05}
                        value={w.amplitude}
                        onChange={(e) => updateWave(i, 'amplitude', Number(e.target.value))}
                        disabled={locked}
                        style={{
                          flex: 1, height: 6,
                          appearance: 'none', WebkitAppearance: 'none',
                          background: locked
                            ? 'linear-gradient(90deg, rgba(51,255,102,0.2), rgba(51,255,102,0.4))'
                            : 'linear-gradient(90deg, rgba(255,0,102,0.2), rgba(255,0,102,0.5))',
                          borderRadius: 0, outline: 'none',
                          cursor: locked ? 'default' : 'pointer',
                          accentColor: locked ? '#33ff66' : '#ff0066',
                        }}
                      />
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>1.0</span>
                    </div>
                  </div>
                </div>

                {/* Lock Button */}
                {!locked && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleLock(i)}
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,0,102,0.2), rgba(255,0,102,0.4))',
                        border: '1px solid rgba(255,0,102,0.5)',
                        color: '#ff0066',
                        padding: '8px 24px',
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: 11,
                        letterSpacing: 2,
                        cursor: 'pointer',
                        clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
                      }}
                    >
                      ロック
                    </motion.button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Progress */}
        <div style={{ marginTop: 20, position: 'relative', zIndex: 3 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 10, color: 'rgba(255,0,102,0.4)', letterSpacing: 1, marginBottom: 6,
          }}>
            <span>マッチ済波形</span>
            <span>{lockedWaves.size} / {waveCount}</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,0,102,0.1)', overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${(lockedWaves.size / waveCount) * 100}%` }}
              transition={{ duration: 0.5 }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #ff0066, #00f0ff)',
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

export default function SignalRelayPuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
