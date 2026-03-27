import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import type { Rank, StageScore } from '@shared/types';
import { useAudio } from '../../audio/useAudio';

/* ── Rank config ───────────────────────────────────────────── */

const RANK_CONFIG: Record<Rank, { color: string; glow: string; label: string }> = {
  S: {
    color: '#ffd700',
    glow: '0 0 40px rgba(255, 215, 0, 0.7), 0 0 80px rgba(255, 215, 0, 0.3)',
    label: 'LEGENDARY',
  },
  A: {
    color: '#00f0ff',
    glow: '0 0 40px rgba(0, 240, 255, 0.6), 0 0 80px rgba(0, 240, 255, 0.25)',
    label: 'EXCELLENT',
  },
  B: {
    color: '#c0c0c0',
    glow: '0 0 30px rgba(192, 192, 192, 0.5), 0 0 60px rgba(192, 192, 192, 0.2)',
    label: 'ADEQUATE',
  },
  C: {
    color: '#883333',
    glow: '0 0 20px rgba(136, 51, 51, 0.5)',
    label: 'COMPROMISED',
  },
};

/* ── Count-up hook ─────────────────────────────────────────── */

function useCountUp(target: number, duration: number = 2000): number {
  const [value, setValue] = useState(0);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    if (target <= 0) return;

    let raf: number;
    startTime.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - (startTime.current ?? now);
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

/* ── Main Component ────────────────────────────────────────── */

const ResultScreen: React.FC = () => {
  const gameResult = useGameStore((s) => s.gameResult);
  const reset = useGameStore((s) => s.reset);
  const audio = useAudio();

  const [showRank, setShowRank] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared' | 'error'>('idle');

  // On mount: stop heartbeat and switch to result BGM
  useEffect(() => {
    audio.stopHeartbeat();
    audio.playBGM('result');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => setShowRank(true), 2200);
    return () => clearTimeout(t);
  }, []);

  if (!gameResult) return null;

  const { stages, totalScore, maxScore, rank } = gameResult;
  const rankCfg = RANK_CONFIG[rank];
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const displayScore = useCountUp(totalScore, 2000);

  const handleReconnect = () => {
    audio.playSFX('click');
    reset();
  };

  const clearedCount = stages.filter((s: StageScore) => s.cleared).length;

  const buildShareText = () => {
    return [
      '\u{1F6F8} STATIC ORBIT \u2014 MISSION REPORT',
      '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501',
      `RANK: ${rank}`,
      `SCORE: ${totalScore} / ${maxScore} (${Math.round(percentage)}%)`,
      `STAGES: ${clearedCount}/${stages.length} CLEARED`,
      '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501',
      '#StaticOrbit #CoopPuzzle',
    ].join('\n');
  };

  const handleShare = async () => {
    audio.playSFX('click');
    const text = buildShareText();

    if (navigator.share) {
      try {
        await navigator.share({ text });
        setShareStatus('shared');
      } catch (err: unknown) {
        // User cancelled share — not an error
        if (err instanceof Error && err.name === 'AbortError') return;
        // Fallback to clipboard
        await copyToClipboard(text);
      }
    } else {
      await copyToClipboard(text);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2500);
    } catch {
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 2500);
    }
  };

  return (
    <div style={screenStyle}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        style={headerStyle}
      >
        <h1 style={titleStyle}>MISSION REPORT</h1>
        <div style={subtitleStyle}>DEBRIEF SUMMARY</div>
      </motion.div>

      {/* Stage list */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        style={stageListStyle}
      >
        <div style={stageHeaderRowStyle}>
          <span style={stageColStyle}>OPERATION</span>
          <span style={stageColCenterStyle}>STATUS</span>
          <span style={stageColRightStyle}>SCORE</span>
          <span style={stageColRightStyle}>ERRORS</span>
        </div>

        {stages.map((stage: StageScore, i: number) => {
          const puzzleLabel = stage.puzzleType
            .split('-')
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.12 }}
              style={stageRowStyle}
            >
              <span style={stageColStyle}>
                <span style={stageIndexStyle}>{String(i + 1).padStart(2, '0')}</span>
                {puzzleLabel}
              </span>
              <span style={stageColCenterStyle}>
                <span
                  style={{
                    ...badgeStyle,
                    background: stage.cleared
                      ? 'rgba(68, 255, 136, 0.1)'
                      : 'rgba(255, 34, 68, 0.1)',
                    borderColor: stage.cleared
                      ? 'rgba(68, 255, 136, 0.4)'
                      : 'rgba(255, 34, 68, 0.4)',
                    color: stage.cleared ? '#44ff88' : '#ff2244',
                  }}
                >
                  {stage.cleared ? 'CLEARED' : 'FAILED'}
                </span>
              </span>
              <span style={{ ...stageColRightStyle, color: '#eee' }}>
                {stage.score}
              </span>
              <span
                style={{
                  ...stageColRightStyle,
                  color: stage.misses > 0 ? '#ff4466' : 'rgba(255, 255, 255, 0.3)',
                }}
              >
                {stage.misses}
              </span>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Score section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        style={scoreSectionStyle}
      >
        {/* Score percentage bar */}
        <div style={percentBarTrackStyle}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ delay: 1.4, duration: 1.5, ease: 'easeOut' }}
            style={{
              ...percentBarFillStyle,
              background: rankCfg.color,
              boxShadow: `0 0 8px ${rankCfg.color}44`,
            }}
          />
        </div>

        <div style={scoreRowStyle}>
          <span style={scoreLabelStyle}>TOTAL SCORE</span>
          <span style={scoreValueStyle}>
            {displayScore}
            <span style={scoreMaxStyle}> / {maxScore}</span>
          </span>
        </div>
      </motion.div>

      {/* Rank display */}
      {showRank && (
        <motion.div
          initial={{ opacity: 0, scale: 3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 10, stiffness: 180, mass: 1.2 }}
          style={rankContainerStyle}
        >
          <span
            style={{
              ...rankLetterStyle,
              color: rankCfg.color,
              textShadow: rankCfg.glow,
            }}
          >
            {rank}
          </span>
          <span
            style={{
              ...rankLabelStyle,
              color: rankCfg.color,
            }}
          >
            {rankCfg.label}
          </span>
        </motion.div>
      )}

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8, duration: 0.6 }}
        style={buttonRowStyle}
      >
        <button className="btn-primary" onClick={handleReconnect}>
          RECONNECT
        </button>
        <button className="btn-primary" onClick={handleReconnect}>
          RETRY
        </button>
        <button
          className="btn-primary"
          onClick={handleShare}
          style={shareButtonStyle}
        >
          {shareStatus === 'copied'
            ? 'COPIED!'
            : shareStatus === 'shared'
            ? 'SHARED!'
            : shareStatus === 'error'
            ? 'FAILED'
            : 'SHARE RESULT'}
        </button>
      </motion.div>
    </div>
  );
};

/* ── Styles ────────────────────────────────────────────────── */

const screenStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  background: '#06080e',
  padding: '24px',
  gap: '16px',
  overflowY: 'auto',
};

const headerStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '4px',
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '1.6rem',
  fontWeight: 900,
  color: '#00f0ff',
  letterSpacing: '0.15em',
  textShadow: '0 0 12px rgba(0, 240, 255, 0.4)',
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.65rem',
  color: 'rgba(255, 255, 255, 0.3)',
  letterSpacing: '0.2em',
  marginTop: '4px',
};

const stageListStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '560px',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const stageHeaderRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '6px 12px',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.6rem',
  color: 'rgba(255, 255, 255, 0.25)',
  letterSpacing: '0.1em',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
};

const stageRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 12px',
  background: 'rgba(255, 255, 255, 0.015)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
  color: 'rgba(255, 255, 255, 0.6)',
};

const stageColStyle: React.CSSProperties = {
  flex: 2,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const stageColCenterStyle: React.CSSProperties = {
  flex: 1,
  textAlign: 'center',
};

const stageColRightStyle: React.CSSProperties = {
  flex: 0.7,
  textAlign: 'right',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
  color: 'rgba(255, 255, 255, 0.5)',
};

const stageIndexStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.6rem',
  color: 'rgba(0, 240, 255, 0.35)',
  letterSpacing: '0.05em',
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  fontFamily: 'var(--font-display)',
  fontSize: '0.55rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  padding: '2px 8px',
  border: '1px solid',
};

const scoreSectionStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '560px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const percentBarTrackStyle: React.CSSProperties = {
  width: '100%',
  height: '4px',
  background: 'rgba(255, 255, 255, 0.06)',
  overflow: 'hidden',
};

const percentBarFillStyle: React.CSSProperties = {
  height: '100%',
};

const scoreRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
};

const scoreLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.7rem',
  fontWeight: 700,
  color: 'rgba(255, 255, 255, 0.4)',
  letterSpacing: '0.15em',
};

const scoreValueStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '1.6rem',
  fontWeight: 700,
  color: '#00f0ff',
  textShadow: '0 0 10px rgba(0, 240, 255, 0.4)',
};

const scoreMaxStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'rgba(255, 255, 255, 0.25)',
};

const rankContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
  margin: '8px 0',
};

const rankLetterStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '5rem',
  fontWeight: 900,
  lineHeight: 1,
  letterSpacing: '0.05em',
};

const rankLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.3em',
  opacity: 0.7,
};

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  marginTop: '8px',
  flexWrap: 'wrap',
  justifyContent: 'center',
};

const shareButtonStyle: React.CSSProperties = {
  color: '#ff00aa',
  borderColor: '#ff00aa',
};

export default ResultScreen;
