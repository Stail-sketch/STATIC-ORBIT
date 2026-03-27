import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { getSocket } from '../../hooks/useSocket';
import Timer from '../ui/Timer';
import MissCounter from '../ui/MissCounter';
import { useAudio } from '../../audio/useAudio';

/* ── Lazy puzzle imports ───────────────────────────────────── */

interface PuzzleProps {
  roleData: Record<string, unknown>;
  role: 'observer' | 'operator' | 'navigator' | 'hacker';
}

import SupportTerminal from '../puzzles/SupportTerminal';
import CircuitLinkPuzzle from '../puzzles/CircuitLinkPuzzle';
import CipherBreakPuzzle from '../puzzles/CipherBreakPuzzle';
import GridSyncPuzzle from '../puzzles/GridSyncPuzzle';
import FreqTunePuzzle from '../puzzles/FreqTunePuzzle';
import MorseDecodePuzzle from '../puzzles/MorseDecodePuzzle';
import MemoryChainPuzzle from '../puzzles/MemoryChainPuzzle';
import HackTerminalPuzzle from '../puzzles/HackTerminalPuzzle';
import SpatialNavPuzzle from '../puzzles/SpatialNavPuzzle';
import ReflexBurstPuzzle from '../puzzles/ReflexBurstPuzzle';
import LogicGatePuzzle from '../puzzles/LogicGatePuzzle';
import OrbitCalcPuzzle from '../puzzles/OrbitCalcPuzzle';

const PUZZLE_MAP: Record<string, React.FC<PuzzleProps>> = {
  'circuit-link': CircuitLinkPuzzle,
  'cipher-break': CipherBreakPuzzle,
  'grid-sync': GridSyncPuzzle,
  'freq-tune': FreqTunePuzzle,
  'morse-decode': MorseDecodePuzzle,
  'memory-chain': MemoryChainPuzzle,
  'hack-terminal': HackTerminalPuzzle,
  'spatial-nav': SpatialNavPuzzle,
  'reflex-burst': ReflexBurstPuzzle,
  'logic-gate': LogicGatePuzzle,
  'orbit-calc': OrbitCalcPuzzle,
};

/* ── Feedback flash overlay ────────────────────────────────── */

const FeedbackFlash: React.FC<{ correct: boolean; feedback?: string }> = ({
  correct,
  feedback,
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: [0, 0.8, 0] }}
    transition={{ duration: 0.8, times: [0, 0.15, 1] }}
    style={{
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 9950,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: correct
        ? 'radial-gradient(ellipse at center, rgba(68, 255, 136, 0.15), transparent 70%)'
        : 'radial-gradient(ellipse at center, rgba(255, 34, 68, 0.2), transparent 70%)',
    }}
  >
    {feedback && (
      <motion.span
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.4rem',
          fontWeight: 800,
          letterSpacing: '0.15em',
          color: correct ? '#44ff88' : '#ff2244',
          textShadow: correct
            ? '0 0 16px rgba(68, 255, 136, 0.6)'
            : '0 0 16px rgba(255, 34, 68, 0.6)',
        }}
      >
        {feedback}
      </motion.span>
    )}
  </motion.div>
);

/* ── Main Component ────────────────────────────────────────── */

const GameScreen: React.FC = () => {
  const currentPuzzleType = useGameStore((s) => s.currentPuzzleType);
  const roleData = useGameStore((s) => s.roleData);
  const myRole = useGameStore((s) => s.myRole);
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const timeLimit = useGameStore((s) => s.timeLimit);
  const missCount = useGameStore((s) => s.missCount);
  const lastFeedback = useGameStore((s) => s.lastFeedback);
  const stagePhase = useGameStore((s) => s.stagePhase);
  const chatMessages = useGameStore((s) => s.chatMessages);

  const audio = useAudio();

  const [chatInput, setChatInput] = useState('');
  const [feedbackKey, setFeedbackKey] = useState(0);
  const prevFeedback = useRef(lastFeedback);
  const prevCountdownSec = useRef<number | null>(null);

  // Track feedback changes to trigger flash + SFX
  useEffect(() => {
    if (lastFeedback && lastFeedback !== prevFeedback.current) {
      setFeedbackKey((k) => k + 1);

      // Play correct/incorrect SFX
      if (lastFeedback.correct) {
        audio.playSFX('correct');
      } else {
        audio.playSFX('incorrect');
      }

      // Play stage-end SFX
      if (lastFeedback.feedback === 'SOLVED') {
        audio.playSFX('stageCleared');
        audio.stopHeartbeat();
      } else if (lastFeedback.feedback === 'TIME UP') {
        audio.playSFX('stageFailed');
        audio.stopHeartbeat();
      }
    }
    prevFeedback.current = lastFeedback;
  }, [lastFeedback, audio]);

  // Heartbeat when time < 15
  useEffect(() => {
    if (timeRemaining < 15 && timeRemaining > 0) {
      audio.playHeartbeat();
    } else {
      audio.stopHeartbeat();
    }
  }, [timeRemaining < 15, audio]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown SFX for last 5 seconds (once per second tick)
  useEffect(() => {
    const ceilSec = Math.ceil(timeRemaining);
    if (ceilSec <= 5 && ceilSec > 0 && ceilSec !== prevCountdownSec.current) {
      audio.playSFX('countdown');
    }
    prevCountdownSec.current = ceilSec;
  }, [timeRemaining, audio]);

  const handleChat = useCallback(() => {
    const msg = chatInput.trim();
    if (!msg) return;
    getSocket().emit('game:chat', { message: msg });
    setChatInput('');
  }, [chatInput]);

  const isEscape = stagePhase === 'escape';
  const PuzzleComponent = currentPuzzleType ? PUZZLE_MAP[currentPuzzleType] : null;

  const puzzleLabel = currentPuzzleType
    ? currentPuzzleType
        .split('-')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : 'UNKNOWN';

  return (
    <div
      style={{
        ...screenStyle,
        borderTop: isEscape ? '2px solid rgba(255, 34, 68, 0.3)' : undefined,
      }}
    >
      {/* Top bar */}
      <div style={topBarStyle}>
        <Timer remaining={timeRemaining} total={timeLimit} />
      </div>

      <div style={infoBarStyle}>
        <span
          style={{
            ...stageLabelStyle,
            color: isEscape ? '#ff4466' : '#00f0ff',
          }}
        >
          {puzzleLabel}
        </span>
        <MissCounter count={missCount} />
      </div>

      {/* Puzzle area */}
      <div style={puzzleAreaStyle}>
        {PuzzleComponent && roleData && myRole ? (
          (myRole === 'navigator' || myRole === 'hacker') ? (
            <SupportTerminal role={myRole} roleData={roleData} />
          ) : (
            <PuzzleComponent roleData={roleData} role={myRole} />
          )
        ) : (
          <div style={noPuzzleStyle}>
            <span className="terminal-text">LOADING PUZZLE MODULE...</span>
          </div>
        )}
      </div>

      {/* Feedback flash */}
      <AnimatePresence>
        {lastFeedback && (
          <FeedbackFlash
            key={feedbackKey}
            correct={lastFeedback.correct}
            feedback={lastFeedback.feedback}
          />
        )}
      </AnimatePresence>

      {/* Bottom chat bar */}
      <div style={bottomBarStyle}>
        <div style={chatPreviewStyle}>
          {chatMessages.length > 0 && (
            <span style={chatPreviewMsgStyle}>
              <span style={{ color: '#00f0ff' }}>
                {chatMessages[chatMessages.length - 1].playerName}:
              </span>{' '}
              {chatMessages[chatMessages.length - 1].message}
            </span>
          )}
        </div>
        <div style={chatInputRowStyle}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleChat()}
            placeholder="Quick message..."
            style={chatInputStyle}
            maxLength={80}
          />
          <button className="btn-primary" onClick={handleChat} style={chatSendStyle}>
            &gt;
          </button>
        </div>
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
  background: '#06080e',
  overflow: 'hidden',
};

const topBarStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
};

const infoBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 16px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
};

const stageLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.8rem',
  fontWeight: 700,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
};

const puzzleAreaStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  minHeight: 0,
  overflow: 'auto',
};

const noPuzzleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0.4,
};

const bottomBarStyle: React.CSSProperties = {
  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  background: 'rgba(0, 0, 0, 0.3)',
};

const chatPreviewStyle: React.CSSProperties = {
  padding: '4px 16px',
  minHeight: '20px',
};

const chatPreviewMsgStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.68rem',
  color: 'rgba(255, 255, 255, 0.45)',
};

const chatInputRowStyle: React.CSSProperties = {
  display: 'flex',
  borderTop: '1px solid rgba(255, 255, 255, 0.04)',
};

const chatInputStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 16px',
  background: 'transparent',
  border: 'none',
  color: '#eee',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
  outline: 'none',
};

const chatSendStyle: React.CSSProperties = {
  padding: '8px 14px',
  fontSize: '0.8rem',
  minWidth: '40px',
};

export default GameScreen;
