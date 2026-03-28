import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { getSocket } from '../../hooks/useSocket';
import { useAudio } from '../../audio/useAudio';
import type { GameMode } from '@shared/types';

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
  const setGameMode = useGameStore((s) => s.setGameMode);
  const audio = useAudio();

  const [name, setName] = useState('');
  const [flow, setFlow] = useState<'idle' | 'modeSelect' | 'join'>('idle');
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [roomInput, setRoomInput] = useState('');
  const [error, setError] = useState('');
  const [hoveredMode, setHoveredMode] = useState<GameMode | null>(null);

  const nameValid = name.trim().length > 0;

  const handleCreateClick = useCallback(async () => {
    if (!nameValid) {
      setError('名前を入力してください');
      return;
    }
    audio.playSFX('click');
    await audio.init();
    audio.playBGM('title');
    setError('');
    setFlow('modeSelect');
  }, [nameValid, audio]);

  const handleModeSelect = useCallback((mode: GameMode) => {
    audio.playSFX('click');
    setSelectedMode(mode);
    setGameMode(mode);
    setPlayerName(name.trim());
    getSocket().emit('room:create', { playerName: name.trim(), gameMode: mode });
  }, [name, setPlayerName, setGameMode, audio]);

  const handleJoinClick = useCallback(async () => {
    if (!nameValid) {
      setError('名前を入力してください');
      return;
    }
    audio.playSFX('click');
    await audio.init();
    audio.playBGM('title');
    setError('');
    setFlow('join');
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
        if (flow === 'join') handleJoinSubmit();
      }
    },
    [flow, handleJoinSubmit],
  );

  const handleBackToIdle = useCallback(() => {
    audio.playSFX('click');
    setFlow('idle');
    setSelectedMode(null);
  }, [audio]);

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

        <AnimatePresence mode="wait">
          {/* ── Name + Create/Join (idle flow) ── */}
          {flow === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}
            >
              {/* Name Input */}
              <div style={inputGroupStyle}>
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
                    if (e.key === 'Enter') handleCreateClick();
                  }}
                  style={inputStyle}
                  placeholder="_______________"
                  autoFocus
                />
              </div>

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
              <div style={buttonRowStyle}>
                <button
                  className="btn-primary"
                  onClick={handleCreateClick}
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
              </div>
            </motion.div>
          )}

          {/* ── Mode Selection ── */}
          {flow === 'modeSelect' && (
            <motion.div
              key="modeSelect"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%', maxWidth: '640px' }}
            >
              <div style={modeSelectTitleStyle}>モード選択</div>

              <div style={modeCardsRowStyle}>
                {/* Story Mode Card */}
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onHoverStart={() => setHoveredMode('story')}
                  onHoverEnd={() => setHoveredMode(null)}
                  onClick={() => handleModeSelect('story')}
                  style={{
                    ...modeCardStyle,
                    borderColor: hoveredMode === 'story' || selectedMode === 'story'
                      ? 'rgba(0, 240, 255, 0.6)'
                      : 'rgba(0, 240, 255, 0.15)',
                    boxShadow: hoveredMode === 'story'
                      ? '0 0 30px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.05)'
                      : 'none',
                  }}
                >
                  <div style={modeCardIconStyle}>
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <path d="M8 6h24v28H8z" stroke="#00f0ff" strokeWidth="1.5" fill="rgba(0,240,255,0.05)" />
                      <path d="M12 12h16M12 18h12M12 24h14" stroke="#00f0ff" strokeWidth="1" opacity="0.6" />
                      <path d="M20 32l6-8-6-2-2 10z" fill="#00f0ff" opacity="0.3" />
                    </svg>
                  </div>
                  <div style={{ ...modeCardTitleStyle, color: '#00f0ff' }}>ストーリーモード</div>
                  <div style={modeCardDescStyle}>
                    ARKTIS CORPの陰謀を暴け。潜入から脱出まで、仲間と共にミッションを遂行せよ。
                  </div>
                  <div style={modeCardTagsStyle}>
                    <span style={{ ...modeTagStyle, borderColor: 'rgba(0, 240, 255, 0.3)', color: '#00f0ff' }}>ステージ制</span>
                    <span style={{ ...modeTagStyle, borderColor: 'rgba(0, 240, 255, 0.3)', color: '#00f0ff' }}>ストーリー付き</span>
                    <span style={{ ...modeTagStyle, borderColor: 'rgba(0, 240, 255, 0.3)', color: '#00f0ff' }}>エンディング</span>
                  </div>
                </motion.div>

                {/* Endless Mode Card */}
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onHoverStart={() => setHoveredMode('endless')}
                  onHoverEnd={() => setHoveredMode(null)}
                  onClick={() => handleModeSelect('endless')}
                  style={{
                    ...modeCardStyle,
                    borderColor: hoveredMode === 'endless' || selectedMode === 'endless'
                      ? 'rgba(255, 0, 170, 0.6)'
                      : 'rgba(255, 0, 170, 0.15)',
                    boxShadow: hoveredMode === 'endless'
                      ? '0 0 30px rgba(255, 0, 170, 0.15), inset 0 0 30px rgba(255, 0, 170, 0.05)'
                      : 'none',
                  }}
                >
                  <div style={modeCardIconStyle}>
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <path d="M20 4C11 4 4 11 4 20s7 16 16 16 16-7 16-16S29 4 20 4z" stroke="#ff00aa" strokeWidth="1.5" fill="rgba(255,0,170,0.05)" />
                      <path d="M12 20c0-4.4 3.6-8 8-8M28 20c0 4.4-3.6 8-8 8" stroke="#ff00aa" strokeWidth="1.5" opacity="0.5" />
                      <path d="M20 14v6l4 4" stroke="#ff00aa" strokeWidth="1.5" opacity="0.7" />
                    </svg>
                  </div>
                  <div style={{ ...modeCardTitleStyle, color: '#ff00aa' }}>エンドレスモード</div>
                  <div style={modeCardDescStyle}>
                    限界に挑め。パズルは無限に生成され、難易度は上がり続ける。失敗するまで止まらない。
                  </div>
                  <div style={modeCardTagsStyle}>
                    <span style={{ ...modeTagStyle, borderColor: 'rgba(255, 0, 170, 0.3)', color: '#ff00aa' }}>ウェーブ制</span>
                    <span style={{ ...modeTagStyle, borderColor: 'rgba(255, 0, 170, 0.3)', color: '#ff00aa' }}>スコアアタック</span>
                    <span style={{ ...modeTagStyle, borderColor: 'rgba(255, 0, 170, 0.3)', color: '#ff00aa' }}>エスカレーション</span>
                  </div>
                </motion.div>
              </div>

              <button
                className="btn-primary"
                onClick={handleBackToIdle}
                style={{ opacity: 0.6, fontSize: '0.7rem' }}
              >
                戻る
              </button>
            </motion.div>
          )}

          {/* ── Join room code input ── */}
          {flow === 'join' && (
            <motion.div
              key="join"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}
            >
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
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button className="btn-primary" onClick={handleJoinSubmit}>
                    接続
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleBackToIdle}
                    style={{ opacity: 0.6 }}
                  >
                    戻る
                  </button>
                </div>
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
  maxWidth: '660px',
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

/* ── Mode Selection Styles ─────────────────────────────────── */

const modeSelectTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.8rem',
  fontWeight: 700,
  letterSpacing: '0.3em',
  color: 'rgba(255, 255, 255, 0.5)',
  textTransform: 'uppercase',
};

const modeCardsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  width: '100%',
  justifyContent: 'center',
  flexWrap: 'wrap',
};

const modeCardStyle: React.CSSProperties = {
  flex: '1 1 260px',
  maxWidth: '300px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  padding: '24px 20px',
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid',
  cursor: 'pointer',
  transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
  clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
};

const modeCardIconStyle: React.CSSProperties = {
  width: '56px',
  height: '56px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
};

const modeCardTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '1.05rem',
  fontWeight: 800,
  letterSpacing: '0.1em',
};

const modeCardDescStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.72rem',
  color: 'rgba(255, 255, 255, 0.5)',
  lineHeight: 1.6,
  textAlign: 'center',
};

const modeCardTagsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '6px',
  flexWrap: 'wrap',
  justifyContent: 'center',
  marginTop: '4px',
};

const modeTagStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.55rem',
  letterSpacing: '0.08em',
  padding: '2px 8px',
  border: '1px solid',
  background: 'transparent',
};

export default TitleScreen;
