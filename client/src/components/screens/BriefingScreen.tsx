import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
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

  const audio = useAudio();
  const [typingDone, setTypingDone] = useState(false);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

      {/* Stage / Wave number */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        style={stageNumberStyle}
      >
        {isEndless ? `WAVE ${stageNum}` : `ステージ ${stageNum} / ${totalNum}`}
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

      {/* Standby pulse */}
      {typingDone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            ...standbyStyle,
            color: isEscape ? '#ff4466' : '#00f0ff',
            textShadow: isEscape
              ? '0 0 10px rgba(255, 68, 102, 0.5)'
              : '0 0 10px rgba(0, 240, 255, 0.4)',
          }}
        >
          スタンバイ...
        </motion.div>
      )}

      {/* Time limit info */}
      <div style={timeLimitStyle}>
        制限時間: {briefing.timeLimit}秒
      </div>
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

const standbyStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.9rem',
  fontWeight: 700,
  letterSpacing: '0.3em',
  marginTop: '20px',
};

const timeLimitStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '20px',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.65rem',
  color: 'rgba(255, 255, 255, 0.2)',
  letterSpacing: '0.15em',
};

export default BriefingScreen;
