// ===== STATIC ORBIT — Freq Tune Puzzle =====

import { useState, useCallback, useMemo } from 'react';
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

/* ── Waveform SVG ──────────────────────────────────────────── */

function WaveformSVG({ frequency, locked }: { frequency: number; locked: boolean }) {
  const points = useMemo(() => {
    const pts: string[] = [];
    const width = 200;
    const height = 40;
    const mid = height / 2;
    // frequency affects wave frequency and amplitude
    const waveFreq = 0.02 + (frequency / 999) * 0.08;
    const amp = 12 + (frequency % 200) / 200 * 8;
    const phase = (frequency * 0.1) % (Math.PI * 2);
    for (let x = 0; x <= width; x += 2) {
      const y = mid + Math.sin(x * waveFreq + phase) * amp * Math.sin(x * waveFreq * 0.3 + phase * 0.5);
      pts.push(`${x},${y.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [frequency]);

  const color = locked ? '#33ff66' : '#ff0066';

  return (
    <svg width="200" height="40" viewBox="0 0 200 40" style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        style={{
          filter: `drop-shadow(0 0 4px ${color}80)`,
        }}
      />
      {/* Center reference line */}
      <line x1="0" y1="20" x2="200" y2="20" stroke={`${color}30`} strokeWidth="0.5" strokeDasharray="4 4" />
    </svg>
  );
}

/* ── Observer View ─────────────────────────────────────────── */

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const targets = roleData.targets as Array<{
    dialIndex: number;
    label: string;
    frequency: number;
    tolerance: number;
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
          <div style={{ marginBottom: 4 }}>/// 周波数ターゲット ///</div>
          <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.5)', letterSpacing: 2 }}>
            オペレーターに伝えてください
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 3 }}>
          {targets.map((t, i) => (
            <motion.div
              key={t.dialIndex}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '14px 16px',
                marginBottom: 8,
                background: 'linear-gradient(90deg, rgba(0,240,255,0.04), rgba(0,240,255,0.08), rgba(0,240,255,0.04))',
                borderLeft: '3px solid rgba(0,240,255,0.6)',
                clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
              }}
            >
              {/* Channel label */}
              <div style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 10,
                letterSpacing: 2,
                color: 'rgba(0,240,255,0.5)',
                minWidth: 90,
              }}>
                チャネル {t.dialIndex + 1}
              </div>

              {/* Frequency readout */}
              <div style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 28,
                fontWeight: 'bold',
                color: '#00f0ff',
                textShadow: '0 0 12px rgba(0,240,255,0.6), 0 0 24px rgba(0,240,255,0.2)',
                letterSpacing: 4,
                minWidth: 140,
                textAlign: 'center',
              }}>
                {t.frequency}
              </div>

              {/* Units */}
              <div style={{
                fontSize: 12,
                color: 'rgba(0,240,255,0.4)',
                letterSpacing: 1,
              }}>
                MHz
              </div>

              {/* Tolerance */}
              <div style={{
                marginLeft: 'auto',
                padding: '4px 12px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(0,240,255,0.15)',
                fontSize: 11,
                color: 'rgba(0,240,255,0.7)',
                letterSpacing: 1,
              }}>
                +/- {t.tolerance}
              </div>
            </motion.div>
          ))}
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
          position: 'relative',
          zIndex: 3,
        }}>
          {targets.length}個の周波数ターゲットを検出 -- 口頭で伝達してください
        </div>
      </div>
    </div>
  );
}

/* ── Operator View ─────────────────────────────────────────── */

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const dialCount = roleData.dialCount as number;
  const frequencyMin = roleData.frequencyMin as number;
  const frequencyMax = roleData.frequencyMax as number;
  const dials = roleData.dials as Array<{ dialIndex: number; label: string }>;
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [frequencies, setFrequencies] = useState<number[]>(
    () => Array.from({ length: dialCount }, () => Math.round((frequencyMin + frequencyMax) / 2))
  );
  const [lockedDials, setLockedDials] = useState<Set<number>>(() => new Set());

  const handleFrequencyChange = useCallback((index: number, value: number) => {
    if (lockedDials.has(index)) return;
    setFrequencies(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, [lockedDials]);

  const handleLock = useCallback((index: number) => {
    if (lockedDials.has(index)) return;
    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'freq-tune',
      action: 'tune',
      data: { dialIndex: index, frequency: frequencies[index] },
    });
    setLockedDials(prev => new Set(prev).add(index));
  }, [frequencies, lockedDials]);

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
          <div style={{ marginBottom: 4 }}>/// 周波数チューニング ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,0,102,0.5)', letterSpacing: 2 }}>
            ダイヤルを目標周波数に合わせよ
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

        {/* Dial Controls */}
        <div style={{ position: 'relative', zIndex: 3 }}>
          {dials.map((dial, i) => {
            const locked = lockedDials.has(dial.dialIndex);
            const freq = frequencies[dial.dialIndex];

            return (
              <motion.div
                key={dial.dialIndex}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                style={{
                  padding: '16px',
                  marginBottom: 10,
                  background: locked
                    ? 'linear-gradient(90deg, rgba(51,255,102,0.04), rgba(51,255,102,0.08), rgba(51,255,102,0.04))'
                    : 'linear-gradient(90deg, rgba(255,0,102,0.04), rgba(255,0,102,0.08), rgba(255,0,102,0.04))',
                  borderLeft: locked ? '3px solid #33ff66' : '3px solid rgba(255,0,102,0.5)',
                  clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                }}
              >
                {/* Dial header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}>
                  <span style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: 11,
                    letterSpacing: 2,
                    color: locked ? '#33ff66' : 'rgba(255,0,102,0.6)',
                  }}>
                    {dial.label}
                  </span>

                  {/* Frequency readout */}
                  <div style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 22,
                    color: locked ? '#33ff66' : '#ff0066',
                    textShadow: locked
                      ? '0 0 10px rgba(51,255,102,0.5)'
                      : '0 0 10px rgba(255,0,102,0.5)',
                    letterSpacing: 3,
                  }}>
                    {freq} <span style={{ fontSize: 12, opacity: 0.5 }}>MHz</span>
                  </div>
                </div>

                {/* Waveform */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  marginBottom: 10,
                }}>
                  <WaveformSVG frequency={freq} locked={locked} />
                </div>

                {/* Slider + Lock */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}>
                  {/* Min label */}
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', minWidth: 30 }}>
                    {frequencyMin}
                  </span>

                  {/* Range input */}
                  <input
                    type="range"
                    min={frequencyMin}
                    max={frequencyMax}
                    value={freq}
                    onChange={(e) => handleFrequencyChange(dial.dialIndex, Number(e.target.value))}
                    disabled={locked}
                    style={{
                      flex: 1,
                      height: 6,
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      background: locked
                        ? 'linear-gradient(90deg, rgba(51,255,102,0.2), rgba(51,255,102,0.4))'
                        : 'linear-gradient(90deg, rgba(255,0,102,0.2), rgba(255,0,102,0.5))',
                      borderRadius: 0,
                      outline: 'none',
                      cursor: locked ? 'default' : 'pointer',
                      accentColor: locked ? '#33ff66' : '#ff0066',
                    }}
                  />

                  {/* Max label */}
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', minWidth: 30 }}>
                    {frequencyMax}
                  </span>

                  {/* Lock button */}
                  {locked ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ type: 'tween', duration: 0.2 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        background: 'rgba(51,255,102,0.1)',
                        border: '1px solid rgba(51,255,102,0.3)',
                        color: '#33ff66',
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: 10,
                        letterSpacing: 2,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>&#10003;</span> ロック済
                    </motion.div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleLock(dial.dialIndex)}
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,0,102,0.2), rgba(255,0,102,0.4))',
                        border: '1px solid rgba(255,0,102,0.5)',
                        color: '#ff0066',
                        padding: '6px 18px',
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: 10,
                        letterSpacing: 2,
                        cursor: 'pointer',
                        clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ロック
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Progress */}
        <div style={{ marginTop: 20, position: 'relative', zIndex: 3 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: 'rgba(255,0,102,0.4)',
            letterSpacing: 1,
            marginBottom: 6,
          }}>
            <span>ロック済ダイヤル</span>
            <span>{lockedDials.size} / {dialCount}</span>
          </div>
          <div style={{
            height: 4,
            background: 'rgba(255,0,102,0.1)',
            overflow: 'hidden',
          }}>
            <motion.div
              animate={{ width: `${(lockedDials.size / dialCount) * 100}%` }}
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

export default function FreqTunePuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
