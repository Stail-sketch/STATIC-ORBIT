// ===== STATIC ORBIT — Orbit Calc Puzzle =====

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

/* ── Gauge SVG ─────────────────────────────────────────────── */

function GaugeSVG({ value, min, max, unit }: { value: number; min: number; max: number; unit: string }) {
  const normalized = (value - min) / (max - min);
  const angle = -135 + normalized * 270; // -135 to +135 degrees arc
  const radius = 55;
  const cx = 70;
  const cy = 70;

  // Arc path
  const arcStart = polarToCartesian(cx, cy, radius, -135);
  const arcEnd = polarToCartesian(cx, cy, radius, 135);
  const needleTip = polarToCartesian(cx, cy, radius - 8, angle);

  return (
    <svg width="140" height="100" viewBox="0 0 140 100">
      {/* Background arc */}
      <path
        d={describeArc(cx, cy, radius, -135, 135)}
        fill="none"
        stroke="rgba(0,240,255,0.15)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Value arc */}
      <path
        d={describeArc(cx, cy, radius, -135, angle)}
        fill="none"
        stroke="#00f0ff"
        strokeWidth="4"
        strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 4px rgba(0,240,255,0.5))' }}
      />
      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={needleTip.x}
        y2={needleTip.y}
        stroke="#00f0ff"
        strokeWidth="2"
        style={{ filter: 'drop-shadow(0 0 3px rgba(0,240,255,0.6))' }}
      />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r="4" fill="#00f0ff" style={{ filter: 'drop-shadow(0 0 4px #00f0ff)' }} />
      {/* Min/Max labels */}
      <text x="10" y="95" fill="rgba(0,240,255,0.3)" fontSize="8" fontFamily="'Share Tech Mono', monospace">
        {min}{unit}
      </text>
      <text x="105" y="95" fill="rgba(0,240,255,0.3)" fontSize="8" fontFamily="'Share Tech Mono', monospace">
        {max}{unit}
      </text>
    </svg>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

/* ── Observer View ─────────────────────────────────────────── */

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const targets = roleData.targets as Array<{
    name: string;
    targetValue: number;
    tolerance: number;
    unit: string;
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
          <div style={{ marginBottom: 4 }}>/// 軌道パラメータ -- 目標値に較正せよ ///</div>
          <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.5)', letterSpacing: 2 }}>
            目標値をオペレーターに伝えてください
          </div>
        </div>

        <div style={{
          position: 'relative',
          zIndex: 3,
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(targets.length, 3)}, 1fr)`,
          gap: 16,
        }}>
          {targets.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              style={{
                padding: 20,
                background: 'linear-gradient(135deg, rgba(0,240,255,0.04), rgba(0,240,255,0.08))',
                border: '1px solid rgba(0,240,255,0.2)',
                clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
                textAlign: 'center',
              }}
            >
              {/* Instrument label */}
              <div style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 10,
                letterSpacing: 2,
                color: 'rgba(0,240,255,0.5)',
                marginBottom: 6,
              }}>
                {t.name.toUpperCase()}
              </div>

              {/* Gauge visual */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                <GaugeSVG
                  value={t.targetValue}
                  min={t.name === 'Azimuth Angle' ? 0 : t.name === 'Thrust Output' ? 0 : 0}
                  max={t.name === 'Azimuth Angle' ? 360 : t.name === 'Thrust Output' ? 100 : 60}
                  unit={t.unit}
                />
              </div>

              {/* Target value */}
              <div style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 32,
                fontWeight: 'bold',
                color: '#00f0ff',
                textShadow: '0 0 16px rgba(0,240,255,0.6), 0 0 32px rgba(0,240,255,0.2)',
                letterSpacing: 4,
              }}>
                {t.targetValue}
              </div>

              {/* Unit */}
              <div style={{
                fontSize: 14,
                color: 'rgba(0,240,255,0.5)',
                letterSpacing: 1,
                marginBottom: 8,
              }}>
                {t.unit}
              </div>

              {/* Tolerance */}
              <div style={{
                padding: '4px 12px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(0,240,255,0.15)',
                fontSize: 11,
                color: 'rgba(0,240,255,0.6)',
                letterSpacing: 1,
                display: 'inline-block',
              }}>
                許容誤差: +/- {t.tolerance}{t.unit}
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
          {targets.length}個の軌道パラメータを検出 -- 口頭で伝達してください
        </div>
      </div>
    </div>
  );
}

/* ── Operator View ─────────────────────────────────────────── */

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const parameters = roleData.parameters as Array<{
    name: string;
    currentValue: number;
    min: number;
    max: number;
    step: number;
    unit: string;
  }>;
  const drift = roleData.drift as { enabled: boolean; timeout: number } | undefined;
  const interference = roleData.interference as boolean | undefined;
  const coupling = roleData.coupling as { sourceIndex: number; targetIndex: number; factor: number } | null | undefined;

  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [values, setValues] = useState<number[]>(() => parameters.map((p) => p.currentValue));
  const [lockedParams, setLockedParams] = useState<Set<number>>(() => new Set());
  const [lockTimers, setLockTimers] = useState<Record<number, number>>({});
  const [jammedParam, setJammedParam] = useState<number | null>(null);
  const lockTimerRefs = useRef<Record<number, ReturnType<typeof setInterval>>>({});

  // Drift: when a param is locked, start a countdown. When it expires, unlock locally.
  const startDriftTimer = useCallback((index: number) => {
    if (!drift?.enabled || !drift.timeout) return;
    const timeout = drift.timeout;
    setLockTimers((prev) => ({ ...prev, [index]: timeout }));

    // Clear existing timer for this index
    if (lockTimerRefs.current[index]) {
      clearInterval(lockTimerRefs.current[index]);
    }

    lockTimerRefs.current[index] = setInterval(() => {
      setLockTimers((prev) => {
        const remaining = (prev[index] ?? 0) - 1;
        if (remaining <= 0) {
          // Unlock this param due to drift
          clearInterval(lockTimerRefs.current[index]);
          delete lockTimerRefs.current[index];
          setLockedParams((lp) => {
            const next = new Set(lp);
            next.delete(index);
            return next;
          });
          const newTimers = { ...prev };
          delete newTimers[index];
          return newTimers;
        }
        return { ...prev, [index]: remaining };
      });
    }, 1000);
  }, [drift]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(lockTimerRefs.current).forEach(clearInterval);
    };
  }, []);

  // Interference: on hard+, intermittently jam a random param display
  useEffect(() => {
    if (!interference) return;
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * parameters.length);
      setJammedParam(idx);
      setTimeout(() => setJammedParam(null), 3000);
    }, 8000 + Math.random() * 5000);
    return () => clearInterval(interval);
  }, [interference, parameters.length]);

  const handleValueChange = useCallback((index: number, value: number) => {
    if (lockedParams.has(index)) return;
    const p = parameters[index];
    const clamped = Math.max(p.min, Math.min(p.max, value));
    setValues((prev) => {
      const next = [...prev];
      next[index] = clamped;
      // Coupling: changing source shifts target
      if (coupling && index === coupling.sourceIndex) {
        const delta = clamped - prev[index];
        const tgt = coupling.targetIndex;
        const tp = parameters[tgt];
        next[tgt] = Math.max(tp.min, Math.min(tp.max, Math.round(next[tgt] + delta * coupling.factor)));
      }
      return next;
    });
  }, [lockedParams, parameters, coupling]);

  const handleLock = useCallback((index: number) => {
    if (lockedParams.has(index)) return;
    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'orbit-calc',
      action: 'calibrate',
      data: { paramIndex: index, value: values[index] },
    });
    setLockedParams((prev) => new Set(prev).add(index));
    startDriftTimer(index);
  }, [values, lockedParams, startDriftTimer]);

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
          <div style={{ marginBottom: 4 }}>/// 軌道キャリブレーション ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,0,102,0.5)', letterSpacing: 2 }}>
            パラメータを目標値に調整せよ
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

        {/* Parameter controls */}
        <div style={{ position: 'relative', zIndex: 3 }}>
          {parameters.map((param, i) => {
            const locked = lockedParams.has(i);
            const value = values[i];

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                style={{
                  padding: 20,
                  marginBottom: 12,
                  background: locked
                    ? 'linear-gradient(90deg, rgba(51,255,102,0.04), rgba(51,255,102,0.08), rgba(51,255,102,0.04))'
                    : 'linear-gradient(90deg, rgba(255,0,102,0.04), rgba(255,0,102,0.08), rgba(255,0,102,0.04))',
                  borderLeft: locked ? '3px solid #33ff66' : '3px solid rgba(255,0,102,0.5)',
                  clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                }}
              >
                {/* Param header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}>
                  <span style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: 11,
                    letterSpacing: 2,
                    color: locked ? '#33ff66' : 'rgba(255,0,102,0.6)',
                  }}>
                    {param.name.toUpperCase()}
                  </span>

                  {/* Digital readout */}
                  <div style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 28,
                    color: locked ? '#33ff66' : '#ff0066',
                    textShadow: locked
                      ? '0 0 12px rgba(51,255,102,0.5)'
                      : '0 0 12px rgba(255,0,102,0.5)',
                    letterSpacing: 4,
                  }}>
                    {jammedParam === i ? '???' : value}
                    <span style={{ fontSize: 14, opacity: 0.5, marginLeft: 4 }}>{param.unit}</span>
                  </div>
                </div>

                {/* Drift countdown for locked params */}
                {locked && drift?.enabled && lockTimers[i] !== undefined && (
                  <div style={{
                    fontSize: 10,
                    color: lockTimers[i] <= 5 ? '#ff3333' : '#ffaa22',
                    letterSpacing: 1,
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <span style={{ animation: 'pulse 1s infinite' }}>{lockTimers[i] <= 5 ? '\u25BC' : '\u25B6'}</span>
                    ロック解除まで: {lockTimers[i]}秒
                  </div>
                )}

                {/* Coupling warning */}
                {coupling && i === coupling.sourceIndex && (
                  <div style={{
                    fontSize: 10,
                    color: '#ffaa22',
                    letterSpacing: 1,
                    marginBottom: 8,
                  }}>
                    \u26A0 パラメータ連動
                  </div>
                )}

                {/* Slider */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 10,
                }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', minWidth: 30 }}>
                    {param.min}{param.unit}
                  </span>

                  <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={value}
                    onChange={(e) => handleValueChange(i, Number(e.target.value))}
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

                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', minWidth: 30 }}>
                    {param.max}{param.unit}
                  </span>
                </div>

                {/* Fine-tuning + Lock */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  {/* Fine-tuning buttons */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleValueChange(i, value - 10)}
                      disabled={locked}
                      style={fineTuneButtonStyle(locked)}
                    >
                      -10
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleValueChange(i, value - 1)}
                      disabled={locked}
                      style={fineTuneButtonStyle(locked)}
                    >
                      -1
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleValueChange(i, value + 1)}
                      disabled={locked}
                      style={fineTuneButtonStyle(locked)}
                    >
                      +1
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleValueChange(i, value + 10)}
                      disabled={locked}
                      style={fineTuneButtonStyle(locked)}
                    >
                      +10
                    </motion.button>
                  </div>

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
                      onClick={() => handleLock(i)}
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
            <span>ロック済パラメータ</span>
            <span>{lockedParams.size} / {parameters.length}</span>
          </div>
          <div style={{
            height: 4,
            background: 'rgba(255,0,102,0.1)',
            overflow: 'hidden',
          }}>
            <motion.div
              animate={{ width: `${(lockedParams.size / parameters.length) * 100}%` }}
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

/* ── Fine-tune button style ────────────────────────────────── */

function fineTuneButtonStyle(locked: boolean): React.CSSProperties {
  return {
    padding: '4px 10px',
    background: locked ? 'rgba(51,255,102,0.05)' : 'rgba(255,0,102,0.1)',
    border: `1px solid ${locked ? 'rgba(51,255,102,0.15)' : 'rgba(255,0,102,0.3)'}`,
    color: locked ? 'rgba(51,255,102,0.3)' : 'rgba(255,0,102,0.7)',
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    cursor: locked ? 'default' : 'pointer',
    letterSpacing: 0,
  };
}

/* ── Main Component ────────────────────────────────────────── */

export default function OrbitCalcPuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
