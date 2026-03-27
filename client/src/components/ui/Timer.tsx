import React, { useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '../../audio/useAudio';

interface TimerProps {
  /** Seconds remaining */
  remaining: number;
  /** Total seconds for this phase */
  total: number;
}

const formatTime = (seconds: number): string => {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

/**
 * Horizontal depleting timer bar with phase-aware color shifts:
 *   >30 s  — cyan (nominal)
 *   15-30s — amber (caution)
 *   <15 s  — red + pulsing + screen vignette
 *   <5 s   — large center flash of remaining seconds
 */
const Timer: React.FC<TimerProps> = ({ remaining, total }) => {
  const audio = useAudio();
  const warnedRef = useRef(false);
  const prevCountdownSec = useRef<number | null>(null);

  const fraction = total > 0 ? Math.max(0, remaining / total) : 0;
  const ceilRemaining = Math.ceil(Math.max(0, remaining));

  // Play 'warning' SFX when timer first crosses below 15 seconds
  useEffect(() => {
    if (remaining <= 15 && remaining > 0 && !warnedRef.current) {
      warnedRef.current = true;
      audio.playSFX('warning');
    }
    // Reset if timer goes back above 15 (new stage)
    if (remaining > 15) {
      warnedRef.current = false;
    }
  }, [remaining, audio]);

  // Play 'countdown' SFX once per second tick when remaining <= 5
  useEffect(() => {
    if (ceilRemaining <= 5 && ceilRemaining > 0 && ceilRemaining !== prevCountdownSec.current) {
      audio.playSFX('countdown');
    }
    prevCountdownSec.current = ceilRemaining;
  }, [ceilRemaining, audio]);

  const phase = useMemo<'nominal' | 'caution' | 'critical' | 'dire'>(() => {
    if (remaining > 30) return 'nominal';
    if (remaining > 15) return 'caution';
    if (remaining > 5) return 'critical';
    return 'dire';
  }, [remaining]);

  const barColor = {
    nominal: '#00f0ff',
    caution: '#ffaa00',
    critical: '#ff2244',
    dire: '#ff2244',
  }[phase];

  const glowColor = {
    nominal: 'rgba(0, 240, 255, 0.4)',
    caution: 'rgba(255, 170, 0, 0.4)',
    critical: 'rgba(255, 34, 68, 0.5)',
    dire: 'rgba(255, 34, 68, 0.6)',
  }[phase];

  return (
    <>
      {/* Timer container */}
      <div style={containerStyle}>
        {/* Time readout */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            color: barColor,
            minWidth: '4em',
            textAlign: 'right',
            letterSpacing: '0.08em',
            textShadow: `0 0 6px ${glowColor}`,
          }}
        >
          {formatTime(remaining)}
        </span>

        {/* Bar track */}
        <div style={trackStyle}>
          <motion.div
            style={{
              height: '100%',
              background: barColor,
              boxShadow: `0 0 8px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.15)`,
              transformOrigin: 'left',
            }}
            animate={{
              width: `${fraction * 100}%`,
              opacity: phase === 'critical' || phase === 'dire' ? [1, 0.5, 1] : 1,
            }}
            transition={
              phase === 'critical' || phase === 'dire'
                ? { width: { duration: 0.4, ease: 'linear' }, opacity: { duration: 0.8, repeat: Infinity } }
                : { duration: 0.4, ease: 'linear' }
            }
          />
        </div>
      </div>

      {/* Red vignette for critical/dire phases */}
      <AnimatePresence>
        {(phase === 'critical' || phase === 'dire') && (
          <motion.div
            key="vignette"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={vignetteStyle}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                boxShadow: 'inset 0 0 100px 30px rgba(255, 20, 40, 0.25)',
                animation: 'vignette-pulse 1.5s ease-in-out infinite',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Large center flash for last 5 seconds */}
      <AnimatePresence>
        {phase === 'dire' && ceilRemaining > 0 && (
          <motion.div
            key={ceilRemaining}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.7, 1.1, 1, 1] }}
            transition={{ duration: 0.85, times: [0, 0.15, 0.6, 1] }}
            style={centerFlashStyle}
          >
            {ceilRemaining}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* ── Static Styles ─────────────────────────────────────────── */

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  width: '100%',
  padding: '0 4px',
};

const trackStyle: React.CSSProperties = {
  flex: 1,
  height: '4px',
  background: 'rgba(255, 255, 255, 0.06)',
  overflow: 'hidden',
  position: 'relative',
};

const vignetteStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 9990,
};

const centerFlashStyle: React.CSSProperties = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  fontFamily: 'var(--font-display)',
  fontSize: '6rem',
  fontWeight: 900,
  color: '#ff2244',
  textShadow:
    '0 0 20px rgba(255, 34, 68, 0.7), 0 0 60px rgba(255, 34, 68, 0.3)',
  pointerEvents: 'none',
  zIndex: 9991,
  lineHeight: 1,
};

export default Timer;
