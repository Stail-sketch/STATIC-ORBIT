import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MissCounterProps {
  /** Current number of misses */
  count: number;
  /** Maximum misses before failure (default 5) */
  max?: number;
}

const MAX_DEFAULT = 5;

/**
 * Displays miss count as filled/empty pip indicators.
 * At 3+ misses, escalates to a "SYSTEM ALERT" warning state.
 */
const MissCounter: React.FC<MissCounterProps> = ({
  count,
  max = MAX_DEFAULT,
}) => {
  const isAlert = count >= 3;
  const pips = Array.from({ length: max }, (_, i) => i < count);

  return (
    <div style={wrapperStyle}>
      {/* Header label */}
      <AnimatePresence mode="wait">
        {isAlert ? (
          <motion.div
            key="alert"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            style={alertLabelStyle}
          >
            <span style={alertIconStyle}>!</span>
            システム警告
          </motion.div>
        ) : (
          <motion.div
            key="normal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={labelStyle}
          >
            エラー
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pip row */}
      <div style={pipRowStyle}>
        {pips.map((filled, i) => (
          <motion.div
            key={i}
            style={{
              ...pipBaseStyle,
              background: filled
                ? isAlert
                  ? '#ff2244'
                  : '#ff00aa'
                : 'rgba(255, 255, 255, 0.08)',
              boxShadow: filled
                ? isAlert
                  ? '0 0 6px rgba(255, 34, 68, 0.6)'
                  : '0 0 4px rgba(255, 0, 170, 0.4)'
                : 'none',
            }}
            animate={
              filled && isAlert
                ? { opacity: [1, 0.4, 1] }
                : { opacity: 1 }
            }
            transition={
              filled && isAlert
                ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
                : {}
            }
          />
        ))}
      </div>

      {/* Numeric readout */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          color: isAlert ? '#ff2244' : 'var(--color-text-muted)',
          letterSpacing: '0.05em',
        }}
      >
        {count}/{max}
      </span>
    </div>
  );
};

/* ── Static Styles ─────────────────────────────────────────── */

const wrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.65rem',
  fontWeight: 600,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
};

const alertLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.65rem',
  fontWeight: 700,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: '#ff2244',
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  textShadow: '0 0 8px rgba(255, 34, 68, 0.5)',
};

const alertIconStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '14px',
  height: '14px',
  fontSize: '0.6rem',
  fontWeight: 900,
  border: '1px solid #ff2244',
  color: '#ff2244',
};

const pipRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '4px',
  alignItems: 'center',
};

const pipBaseStyle: React.CSSProperties = {
  width: '10px',
  height: '10px',
  clipPath: 'polygon(2px 0, 100% 0, calc(100% - 2px) 100%, 0 100%)',
  transition: 'background 200ms ease-out, box-shadow 200ms ease-out',
};

export default MissCounter;
