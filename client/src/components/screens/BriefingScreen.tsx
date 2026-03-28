import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { getSocket } from '../../hooks/useSocket';
import TypewriterText from '../effects/TypewriterText';
import { useAudio } from '../../audio/useAudio';

const PUZZLE_NAMES_JP: Record<string, string> = {
  'circuit-link': '回線接続',
  'cipher-break': '暗号解読',
  'grid-sync': 'グリッド同期',
  'freq-tune': '周波数調整',
  'morse-decode': 'モールス解読',
  'memory-chain': '記憶シーケンス',
  'hack-terminal': 'ハッキング',
  'spatial-nav': '船内ナビ',
  'reflex-burst': 'リアクション',
  'logic-gate': '論理推理',
  'orbit-calc': '軌道計算',
};

const BriefingScreen: React.FC = () => {
  const briefing = useGameStore((s) => s.briefing);
  const stagePhase = useGameStore((s) => s.stagePhase);
  const gameMode = useGameStore((s) => s.gameMode);
  const isEndless = gameMode === 'endless';
  const readyPlayers = useGameStore((s) => s.readyPlayers);
  const isReady = useGameStore((s) => s.isReady);
  const countdown = useGameStore((s) => s.countdown);
  const players = useGameStore((s) => s.players);
  const roomCode = useGameStore((s) => s.roomCode);
  const livesRemaining = useGameStore((s) => s.livesRemaining);

  const audio = useAudio();
  const [typingDone, setTypingDone] = useState(false);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleReady = useCallback(() => {
    if (isReady || !roomCode) return;
    getSocket().emit('game:ready', { roomCode });
    useGameStore.getState().setMyReady();
  }, [isReady, roomCode]);

  // On mount: switch BGM and play warning SFX for escape phase
  useEffect(() => {
    if (isEndless) {
      audio.playBGM('infiltration');
    } else {
      audio.playBGM(stagePhase === 'escape' ? 'escape' : 'infiltration');
      if (stagePhase === 'escape') {
        audio.playSFX('warning');
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Play periodic 'typing' SFX while typewriter is active
  useEffect(() => {
    if (!typingDone) {
      typingIntervalRef.current = setInterval(() => {
        audio.playSFX('typing');
      }, 800);
    }
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    };
  }, [typingDone, audio]);

  if (!briefing) return null;

  const isEscape = stagePhase === 'escape';
  const stageNum = String(briefing.stageIndex + 1).padStart(2, '0');
  const totalNum = String(briefing.totalStages).padStart(2, '0');

  const puzzleLabel = briefing.puzzleType
    .split('-')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const storyLines = briefing.storyText
    .split('\n')
    .filter((l) => l.trim().length > 0);

  return (
    <div
      style={{
        ...screenStyle,
        background: isEscape
          ? 'linear-gradient(180deg, #0a0204 0%, #12060a 50%, #06080e 100%)'
          : '#06080e',
      }}
    >
      {/* Warning stripe for escape phase */}
      {isEscape && !isEndless && <div style={warningStripeStyle} />}

      {/* Stage phase badge — hidden in endless mode */}
      {!isEndless && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            ...phaseBadgeStyle,
            background: isEscape
              ? 'rgba(255, 34, 68, 0.12)'
              : 'rgba(0, 240, 255, 0.08)',
            borderColor: isEscape
              ? 'rgba(255, 34, 68, 0.4)'
              : 'rgba(0, 240, 255, 0.3)',
            color: isEscape ? '#ff2244' : '#00f0ff',
          }}
        >
          {stagePhase === 'escape' ? '脱出フェーズ' : '潜入フェーズ'}
        </motion.div>
      )}

      {/* Endless mode badge */}
      {isEndless && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            ...phaseBadgeStyle,
            background: 'rgba(255, 0, 170, 0.08)',
            borderColor: 'rgba(255, 0, 170, 0.4)',
            color: '#ff00aa',
          }}
        >
          エンドレスモード
        </motion.div>
      )}

      {/* Stage / Wave number + Time limit */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        style={stageNumberStyle}
      >
        {isEndless ? `WAVE ${stageNum}` : `ステージ ${stageNum} / ${totalNum}`}
        <span style={stageTimeLimitStyle}>
          制限時間: {briefing.timeLimit}秒
        </span>
      </motion.div>

      {/* Puzzle type name */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        style={{
          ...puzzleTitleStyle,
          color: isEscape ? '#ff4466' : '#00f0ff',
          textShadow: isEscape
            ? '0 0 12px rgba(255, 34, 68, 0.5)'
            : '0 0 12px rgba(0, 240, 255, 0.4)',
        }}
      >
        {puzzleLabel}
        {briefing.puzzleType && PUZZLE_NAMES_JP[briefing.puzzleType] && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              fontWeight: 400,
              letterSpacing: '0.15em',
              marginTop: '4px',
              opacity: 0.6,
            }}
          >
            {PUZZLE_NAMES_JP[briefing.puzzleType]}
          </div>
        )}
      </motion.h2>

      {/* Divider */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        style={{
          ...dividerStyle,
          background: isEscape
            ? 'linear-gradient(90deg, transparent, rgba(255, 34, 68, 0.4), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.3), transparent)',
        }}
      />

      {/* Terminal story text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0, duration: 0.5 }}
        style={terminalBoxStyle}
      >
        <div style={terminalHeaderStyle}>
          <span style={terminalDotStyle} />
          <span style={terminalLabelStyle}>ミッションブリーフ</span>
        </div>
        <div style={terminalBodyStyle}>
          <TypewriterText
            lines={storyLines}
            speed={35}
            onComplete={() => setTypingDone(true)}
          />
        </div>
      </motion.div>

      {/* Puzzle guide panel */}
      {briefing.puzzleGuide && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          style={guideBoxStyle}
        >
          <div style={guideHeaderStyle}>
            <span style={guideDotStyle} />
            <span style={guideLabelStyle}>ミッション指示</span>
          </div>
          <div style={guideBodyStyle}>
            {briefing.puzzleGuide.split('\n').map((line, i) => {
              const isObserver = line.startsWith('【オブザーバー】');
              const isOperator = line.startsWith('【オペレーター】');
              let color = 'rgba(255, 255, 255, 0.75)';
              let labelColor = color;
              if (isObserver) {
                labelColor = '#00f0ff';
              } else if (isOperator) {
                labelColor = '#ff44ff';
              }
              const label = isObserver
                ? '【オブザーバー】'
                : isOperator
                  ? '【オペレーター】'
                  : '';
              const body = label ? line.slice(label.length) : line;
              return (
                <div key={i} style={{ marginBottom: i < briefing.puzzleGuide!.split('\n').length - 1 ? '10px' : 0 }}>
                  {label && (
                    <span
                      style={{
                        color: labelColor,
                        fontWeight: 700,
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.75rem',
                        textShadow: isObserver
                          ? '0 0 8px rgba(0, 240, 255, 0.4)'
                          : '0 0 8px rgba(255, 68, 255, 0.4)',
                      }}
                    >
                      {label}
                    </span>
                  )}
                  <span style={{ color, fontFamily: 'var(--font-mono)', fontSize: '0.7rem', lineHeight: '1.6' }}>
                    {body}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Lives remaining (story mode only) */}
      {gameMode === 'story' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={livesStyle}
        >
          残機:{' '}
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                color: i < livesRemaining ? '#ff4466' : 'rgba(255, 255, 255, 0.15)',
                textShadow: i < livesRemaining ? '0 0 8px rgba(255, 68, 102, 0.5)' : 'none',
                fontSize: '1.1rem',
                marginLeft: '2px',
              }}
            >
              {i < livesRemaining ? '\u2665' : '\u2661'}
            </span>
          ))}
        </motion.div>
      )}

      {/* Ready button and status */}
      {typingDone && countdown === null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={readySectionStyle}
        >
          {/* Ready status */}
          <div style={readyStatusStyle}>
            {readyPlayers.length}/{players.length} 準備完了
          </div>

          {/* Ready button */}
          <button
            className="btn-primary"
            onClick={handleReady}
            disabled={isReady}
            style={{
              ...readyButtonStyle,
              opacity: isReady ? 0.6 : 1,
              cursor: isReady ? 'default' : 'pointer',
              background: isReady
                ? 'rgba(0, 240, 255, 0.1)'
                : undefined,
              borderColor: isReady
                ? 'rgba(0, 240, 255, 0.3)'
                : undefined,
            }}
          >
            {isReady ? '準備完了 \u2713' : '準備完了'}
          </button>
        </motion.div>
      )}

      {/* Countdown overlay */}
      <AnimatePresence>
        {countdown !== null && countdown > 0 && (
          <motion.div
            key={`countdown-${countdown}`}
            initial={{ opacity: 0, scale: 2.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={countdownOverlayStyle}
          >
            <span style={countdownNumberStyle}>{countdown}</span>
          </motion.div>
        )}
      </AnimatePresence>

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
  justifyContent: 'center',
  padding: '32px 24px',
  gap: '12px',
  overflow: 'hidden',
};

const warningStripeStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: '3px',
  background: 'repeating-linear-gradient(90deg, #ff2244 0px, #ff2244 20px, transparent 20px, transparent 40px)',
  opacity: 0.6,
};

const phaseBadgeStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.65rem',
  fontWeight: 700,
  letterSpacing: '0.2em',
  padding: '4px 14px',
  border: '1px solid',
  textTransform: 'uppercase',
};

const stageNumberStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.8rem',
  color: 'rgba(255, 255, 255, 0.35)',
  letterSpacing: '0.2em',
  marginTop: '8px',
};

const puzzleTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '1.8rem',
  fontWeight: 800,
  letterSpacing: '0.1em',
  margin: 0,
};

const dividerStyle: React.CSSProperties = {
  width: '200px',
  height: '1px',
  margin: '8px 0',
};

const terminalBoxStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '540px',
  background: 'rgba(0, 0, 0, 0.4)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  marginTop: '8px',
};

const terminalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
};

const terminalDotStyle: React.CSSProperties = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  background: '#44ff88',
  boxShadow: '0 0 4px rgba(68, 255, 136, 0.5)',
};

const terminalLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.6rem',
  color: 'rgba(255, 255, 255, 0.3)',
  letterSpacing: '0.15em',
};

const terminalBodyStyle: React.CSSProperties = {
  padding: '16px',
  minHeight: '100px',
};

const guideBoxStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '540px',
  background: 'rgba(0, 240, 255, 0.03)',
  border: '1px solid rgba(0, 240, 255, 0.15)',
  marginTop: '8px',
};

const guideHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  borderBottom: '1px solid rgba(0, 240, 255, 0.1)',
};

const guideDotStyle: React.CSSProperties = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  background: '#ffaa22',
  boxShadow: '0 0 4px rgba(255, 170, 34, 0.5)',
};

const guideLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.6rem',
  color: 'rgba(255, 255, 255, 0.3)',
  letterSpacing: '0.15em',
};

const guideBodyStyle: React.CSSProperties = {
  padding: '14px 16px',
};

const livesStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
  color: 'rgba(255, 255, 255, 0.5)',
  letterSpacing: '0.1em',
  marginTop: '8px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
};

const readySectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
  marginTop: '32px',
  paddingTop: '16px',
  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
};

const readyStatusStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
  color: 'rgba(0, 240, 255, 0.6)',
  letterSpacing: '0.15em',
};

const readyButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '1rem',
  fontWeight: 700,
  letterSpacing: '0.2em',
  padding: '12px 40px',
};

const countdownOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  pointerEvents: 'none',
};

const countdownNumberStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '120px',
  fontWeight: 900,
  color: '#00f0ff',
  textShadow: '0 0 40px rgba(0, 240, 255, 0.6), 0 0 80px rgba(0, 240, 255, 0.3), 0 0 120px rgba(0, 240, 255, 0.15)',
  letterSpacing: '0.05em',
};

const stageTimeLimitStyle: React.CSSProperties = {
  marginLeft: '16px',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
  color: 'rgba(255, 255, 255, 0.3)',
  letterSpacing: '0.1em',
};

export default BriefingScreen;
