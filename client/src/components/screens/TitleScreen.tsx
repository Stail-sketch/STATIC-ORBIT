import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { getSocket } from '../../hooks/useSocket';
import { useAudio } from '../../audio/useAudio';

/* ── Tiny star-field canvas ────────────────────────────────── */

const StarField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    const stars: { x: number; y: number; r: number; a: number; s: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 180; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.4 + 0.3,
        a: Math.random(),
        s: Math.random() * 0.003 + 0.001,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const st of stars) {
        st.a += st.s;
        const alpha = 0.2 + Math.abs(Math.sin(st.a)) * 0.6;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 220, 255, ${alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  );
};

/* ── Main Component ────────────────────────────────────────── */

const TitleScreen: React.FC = () => {
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const setRoomCode = useGameStore((s) => s.setRoomCode);
  const audio = useAudio();

  const [name, setName] = useState('');
  const [mode, setMode] = useState<'idle' | 'join'>('idle');
  const [roomInput, setRoomInput] = useState('');
  const [error, setError] = useState('');

  const nameValid = name.trim().length > 0;

  const handleCreate = useCallback(async () => {
    if (!nameValid) {
      setError('名前を入力してください');
      return;
    }
    audio.playSFX('click');
    await audio.init();
    audio.playBGM('title');
    setPlayerName(name.trim());
    getSocket().emit('room:create', { playerName: name.trim() });
  }, [name, nameValid, setPlayerName, audio]);

  const handleJoinClick = useCallback(async () => {
    if (!nameValid) {
      setError('名前を入力してください');
      return;
    }
    audio.playSFX('click');
    await audio.init();
    audio.playBGM('title');
    setError('');
    setMode('join');
  }, [nameValid, audio]);

  const handleJoinSubmit = useCallback(() => {
    const code = roomInput.trim().toUpperCase();
    if (!code) {
      setError('ルームコードを入力してください');
      return;
    }
    audio.playSFX('click');
    setPlayerName(name.trim());
    setRoomCode(code);
    getSocket().emit('room:join', { roomCode: code, playerName: name.trim() });
  }, [roomInput, name, setPlayerName, setRoomCode, audio]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (mode === 'join') handleJoinSubmit();
      }
    },
    [mode, handleJoinSubmit],
  );

  return (
    <div style={screenStyle}>
      <StarField />

      {/* Scan line */}
      <div style={scanLineStyle} />

      {/* CONNECTION ESTABLISHED */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0.3, 1] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        style={connectionStyle}
      >
        接続確立
      </motion.div>

      {/* Central content */}
      <div style={contentStyle}>
        {/* Logo */}
        <motion.h1
          className="glitch-text"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={logoStyle}
        >
          STATIC ORBIT
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 1.2 }}
          style={subtitleStyle}
        >
          協力型リアルタイム謎解きゲーム
        </motion.p>

        {/* Name Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.6 }}
          style={inputGroupStyle}
        >
          <label style={labelStyle}>エージェント名:</label>
          <input
            type="text"
            value={name}
            maxLength={16}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && mode === 'idle') handleCreate();
            }}
            style={inputStyle}
            placeholder="_______________"
            autoFocus
          />
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={errorStyle}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          style={buttonRowStyle}
        >
          <button
            className="btn-primary"
            onClick={handleCreate}
            style={!nameValid ? disabledBtnStyle : undefined}
          >
            ルーム作成
          </button>
          <button
            className="btn-primary"
            onClick={handleJoinClick}
            style={!nameValid ? disabledBtnStyle : undefined}
          >
            ルーム参加
          </button>
        </motion.div>

        {/* Join room code input */}
        <AnimatePresence>
          {mode === 'join' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', marginTop: '16px' }}
            >
              <div style={inputGroupStyle}>
                <label style={labelStyle}>ルームコード:</label>
                <input
                  type="text"
                  value={roomInput}
                  maxLength={6}
                  onChange={(e) => {
                    setRoomInput(e.target.value.toUpperCase());
                    setError('');
                  }}
                  onKeyDown={handleKeyDown}
                  style={{ ...inputStyle, letterSpacing: '0.3em', textAlign: 'center' }}
                  placeholder="______"
                  autoFocus
                />
                <button
                  className="btn-primary"
                  onClick={handleJoinSubmit}
                  style={{ marginTop: '8px' }}
                >
                  接続
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Version tag */}
      <div style={versionStyle}>v0.1.0 // STATIC ORBIT</div>
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
  background: '#06080e',
  overflow: 'hidden',
};

const scanLineStyle: React.CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  height: '2px',
  background: 'rgba(0, 240, 255, 0.04)',
  zIndex: 1,
  pointerEvents: 'none',
  animation: 'scan-line 8s linear infinite',
};

const connectionStyle: React.CSSProperties = {
  position: 'absolute',
  top: '24px',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.7rem',
  letterSpacing: '0.2em',
  color: '#00f0ff',
  textShadow: '0 0 8px rgba(0, 240, 255, 0.5)',
  zIndex: 2,
};

const contentStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 2,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  padding: '0 24px',
  maxWidth: '480px',
  width: '100%',
};

const logoStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
  fontWeight: 900,
  color: '#00f0ff',
  textShadow: '0 0 20px rgba(0, 240, 255, 0.6), 0 0 60px rgba(0, 240, 255, 0.2)',
  letterSpacing: '0.12em',
  textAlign: 'center',
  lineHeight: 1.1,
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.8rem',
  color: 'rgba(255, 255, 255, 0.4)',
  letterSpacing: '0.25em',
  marginBottom: '32px',
};

const inputGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6px',
  width: '100%',
  maxWidth: '320px',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.7rem',
  color: 'rgba(0, 240, 255, 0.6)',
  letterSpacing: '0.15em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'rgba(0, 240, 255, 0.04)',
  border: '1px solid rgba(0, 240, 255, 0.2)',
  color: '#00f0ff',
  fontFamily: 'var(--font-mono)',
  fontSize: '1rem',
  outline: 'none',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
};

const errorStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.7rem',
  color: '#ff2244',
  letterSpacing: '0.1em',
  textShadow: '0 0 6px rgba(255, 34, 68, 0.5)',
  marginTop: '4px',
};

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  marginTop: '16px',
};

const disabledBtnStyle: React.CSSProperties = {
  opacity: 0.35,
  pointerEvents: 'none',
};

const versionStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '16px',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.6rem',
  color: 'rgba(255, 255, 255, 0.15)',
  letterSpacing: '0.1em',
  zIndex: 2,
};

export default TitleScreen;
