import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import TypewriterText from '../effects/TypewriterText';
import { useAudio } from '../../audio/useAudio';
import { getSocket } from '../../hooks/useSocket';

const PhaseChangeScreen: React.FC = () => {
  const phaseNarrative = useGameStore((s) => s.phaseNarrative);
  const isHost = useGameStore((s) => s.isHost);
  const roomCode = useGameStore((s) => s.roomCode);
  const audio = useAudio();

  const [stage, setStage] = useState<'blackout' | 'glitch' | 'narrative' | 'warning'>('blackout');
  const [narrativeDone, setNarrativeDone] = useState(false);

  // On mount: stop current BGM and play phaseChange SFX
  useEffect(() => {
    audio.stopBGM();
    audio.playSFX('phaseChange');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Play 'alert' SFX during warning stage, then start escape BGM
  useEffect(() => {
    if (stage === 'warning') {
      audio.playSFX('alert');
      audio.playBGM('escape');
    }
  }, [stage, audio]);

  // Phase progression: blackout -> glitch -> narrative -> warning
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Blackout for 1s
    timers.push(setTimeout(() => setStage('glitch'), 1000));
    // Glitch for 1.5s then show narrative
    timers.push(setTimeout(() => setStage('narrative'), 2500));

    return () => timers.forEach(clearTimeout);
  }, []);

  // After narrative completes, show warning
  useEffect(() => {
    if (narrativeDone) {
      const t = setTimeout(() => setStage('warning'), 500);
      return () => clearTimeout(t);
    }
  }, [narrativeDone]);

  return (
    <div style={screenStyle}>
      {/* Pure black overlay during blackout */}
      <AnimatePresence>
        {stage === 'blackout' && (
          <motion.div
            key="blackout"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={blackoutStyle}
          />
        )}
      </AnimatePresence>

      {/* Red pulsing vignette - starts during glitch phase */}
      {stage !== 'blackout' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={vignetteStyle}
        >
          <div style={vignettePulseStyle} />
        </motion.div>
      )}

      {/* Glitch lines */}
      {(stage === 'glitch' || stage === 'narrative' || stage === 'warning') && (
        <div style={glitchContainerStyle}>
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -100 }}
              animate={{
                opacity: [0, 0.8, 0, 0.5, 0],
                x: [-100, 50, -30, 80, 200],
              }}
              transition={{
                duration: 0.4 + Math.random() * 0.6,
                delay: Math.random() * 1.5,
                repeat: Infinity,
                repeatDelay: Math.random() * 3 + 1,
              }}
              style={{
                position: 'absolute',
                top: `${10 + Math.random() * 80}%`,
                left: 0,
                right: 0,
                height: `${1 + Math.random() * 3}px`,
                background: `rgba(255, ${Math.random() > 0.5 ? '34, 68' : '0, 170'}, ${0.3 + Math.random() * 0.4})`,
                filter: 'blur(0.5px)',
              }}
            />
          ))}
        </div>
      )}

      {/* Central content */}
      <div style={contentStyle}>
        {/* Glitch stage: rapid text flashes */}
        <AnimatePresence>
          {stage === 'glitch' && (
            <motion.div
              key="glitch-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0, 1, 0.3, 1, 0] }}
              transition={{ duration: 1.5, times: [0, 0.1, 0.15, 0.3, 0.35, 0.5, 1] }}
              style={glitchTextStyle}
            >
              侵入検知
            </motion.div>
          )}
        </AnimatePresence>

        {/* Narrative */}
        {stage === 'narrative' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            style={narrativeBoxStyle}
          >
            <TypewriterText
              lines={phaseNarrative.length > 0 ? phaseNarrative : ['...']}
              speed={45}
              onComplete={() => setNarrativeDone(true)}
            />
          </motion.div>
        )}

        {/* Warning stage */}
        {stage === 'warning' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            style={warningContainerStyle}
          >
            <motion.div
              className="glitch-text"
              animate={{ opacity: [1, 0.3, 1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={warningTextStyle}
            >
              警告
            </motion.div>
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={lockdownTextStyle}
            >
              システムロックダウン開始
            </motion.div>

            {/* Red pulse rings */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.5, opacity: 0.6 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{
                  duration: 2,
                  delay: i * 0.7,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
                style={pulseRingStyle}
              />
            ))}

            {/* Host: click to proceed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.5 }}
              style={{ marginTop: 40, textAlign: 'center' as const }}
            >
              {isHost ? (
                <motion.button
                  onClick={() => {
                    if (roomCode) {
                      getSocket().emit('game:chapterDone', { roomCode });
                    }
                  }}
                  style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#ff2244',
                    backgroundColor: 'transparent',
                    border: '2px solid #ff2244',
                    padding: '12px 40px',
                    cursor: 'pointer',
                    letterSpacing: 3,
                    clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    boxShadow: [
                      '0 0 8px rgba(255,34,68,0.3)',
                      '0 0 20px rgba(255,34,68,0.6)',
                      '0 0 8px rgba(255,34,68,0.3)',
                    ],
                  }}
                  transition={{
                    boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                  }}
                >
                  {'次へ ▶'}
                </motion.button>
              ) : (
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, color: '#884444', letterSpacing: 2 }}>
                  ホストの操作を待っています...
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Horizontal hazard stripe */}
      {stage !== 'blackout' && (
        <>
          <div style={{ ...hazardStripeStyle, top: 0 }} />
          <div style={{ ...hazardStripeStyle, bottom: 0 }} />
        </>
      )}
    </div>
  );
};

/* ── Styles ────────────────────────────────────────────────── */

const screenStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: '#06080e',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  zIndex: 100,
};

const blackoutStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: '#000',
  zIndex: 200,
};

const vignetteStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 1,
};

const vignettePulseStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  boxShadow: 'inset 0 0 150px 40px rgba(255, 20, 40, 0.2)',
  animation: 'vignette-pulse 2s ease-in-out infinite',
};

const glitchContainerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 2,
  overflow: 'hidden',
};

const contentStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 10,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  maxWidth: '600px',
  width: '100%',
  padding: '24px',
};

const glitchTextStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(1.5rem, 5vw, 3rem)',
  fontWeight: 900,
  color: '#ff2244',
  letterSpacing: '0.2em',
  textShadow: '0 0 30px rgba(255, 34, 68, 0.8), 3px 0 0 rgba(0, 240, 255, 0.3), -3px 0 0 rgba(255, 0, 170, 0.3)',
  textAlign: 'center',
};

const narrativeBoxStyle: React.CSSProperties = {
  width: '100%',
  padding: '24px',
  background: 'rgba(255, 20, 40, 0.03)',
  border: '1px solid rgba(255, 34, 68, 0.15)',
  wordBreak: 'keep-all',
  overflowWrap: 'break-word',
};

const warningContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  position: 'relative',
};

const warningTextStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(2rem, 8vw, 4rem)',
  fontWeight: 900,
  color: '#ff2244',
  letterSpacing: '0.25em',
  textShadow: '0 0 40px rgba(255, 34, 68, 0.8), 0 0 80px rgba(255, 34, 68, 0.3)',
};

const lockdownTextStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.85rem',
  color: '#ff4466',
  letterSpacing: '0.2em',
  textShadow: '0 0 10px rgba(255, 68, 102, 0.5)',
};

const pulseRingStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: '100px',
  height: '100px',
  marginTop: '-50px',
  marginLeft: '-50px',
  borderRadius: '50%',
  border: '2px solid rgba(255, 34, 68, 0.3)',
  pointerEvents: 'none',
};

const hazardStripeStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  height: '4px',
  background: 'repeating-linear-gradient(90deg, #ff2244 0px, #ff2244 16px, transparent 16px, transparent 32px)',
  opacity: 0.5,
  zIndex: 20,
};

export default PhaseChangeScreen;
