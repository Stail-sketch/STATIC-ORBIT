import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { getSocket } from '../../hooks/useSocket';
import { useAudio } from '../../audio/useAudio';

const MAX_PLAYERS = 4;

const ROLE_COLORS: Record<string, string> = {
  observer: '#00f0ff',
  operator: '#ff00aa',
  navigator: '#ffaa00',
  hacker: '#44ff88',
};

const LobbyScreen: React.FC = () => {
  const roomCode = useGameStore((s) => s.roomCode);
  const players = useGameStore((s) => s.players);
  const playerId = useGameStore((s) => s.playerId);
  const isHost = useGameStore((s) => s.isHost);
  const chatMessages = useGameStore((s) => s.chatMessages);

  const audio = useAudio();

  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevPlayerCount = useRef(players.length);

  const me = players.find((p) => p.id === playerId);
  const allReady = players.length >= 2 && players.every((p) => p.ready);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  // Play 'connect' SFX when a new player joins
  useEffect(() => {
    if (players.length > prevPlayerCount.current) {
      audio.playSFX('connect');
    }
    prevPlayerCount.current = players.length;
  }, [players.length, audio]);

  const handleCopy = useCallback(() => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [roomCode]);

  const handleReady = useCallback(() => {
    if (playerId) {
      audio.playSFX('click');
      getSocket().emit('room:ready', { playerId });
    }
  }, [playerId, audio]);

  const handleStart = useCallback(() => {
    if (roomCode) {
      audio.playSFX('click');
      getSocket().emit('room:start', { roomCode });
    }
  }, [roomCode, audio]);

  const handleChat = useCallback(() => {
    const msg = chatInput.trim();
    if (!msg) return;
    getSocket().emit('game:chat', { message: msg });
    setChatInput('');
  }, [chatInput]);

  return (
    <div style={screenStyle}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={headerStyle}
      >
        <span style={headerLabelStyle}>SECURE CHANNEL</span>
      </motion.div>

      {/* Room Code */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        style={roomCodeContainerStyle}
      >
        <span style={roomCodeLabelStyle}>ROOM CODE</span>
        <div style={roomCodeRowStyle}>
          <span style={roomCodeStyle}>{roomCode ?? '------'}</span>
          <button onClick={handleCopy} style={copyBtnStyle}>
            {copied ? 'COPIED' : 'COPY'}
          </button>
        </div>
      </motion.div>

      {/* Player count */}
      <div style={playerCountStyle}>
        AGENTS: {players.length}/{MAX_PLAYERS}
      </div>

      {/* Player List */}
      <div style={playerListStyle}>
        <AnimatePresence>
          {players.map((player, i) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ delay: i * 0.1 }}
              style={{
                ...playerCardStyle,
                borderColor: player.id === playerId
                  ? 'rgba(0, 240, 255, 0.4)'
                  : 'rgba(255, 255, 255, 0.08)',
              }}
            >
              {/* Ready indicator */}
              <div
                style={{
                  ...readyDotStyle,
                  background: player.ready ? '#44ff88' : 'rgba(255, 255, 255, 0.15)',
                  boxShadow: player.ready ? '0 0 8px rgba(68, 255, 136, 0.6)' : 'none',
                }}
              />

              {/* Name + Host badge */}
              <div style={playerInfoStyle}>
                <span style={playerNameStyle}>
                  {player.name}
                  {player.isHost && <span style={hostBadgeStyle}>HOST</span>}
                </span>
                <span
                  style={{
                    ...roleLabelStyle,
                    color: ROLE_COLORS[player.role] ?? '#aaa',
                  }}
                >
                  {player.role.toUpperCase()}
                </span>
              </div>

              {/* Status */}
              <span style={statusTextStyle}>
                {player.ready ? 'READY' : 'STANDBY'}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div style={actionRowStyle}>
        <button
          className={me?.ready ? 'btn-danger' : 'btn-primary'}
          onClick={handleReady}
        >
          {me?.ready ? 'CANCEL READY' : 'READY UP'}
        </button>

        {isHost && (
          <button
            className="btn-primary"
            onClick={handleStart}
            style={!allReady ? { opacity: 0.35, pointerEvents: 'none' } : undefined}
          >
            LAUNCH MISSION
          </button>
        )}
      </div>

      {/* Chat area */}
      <div style={chatContainerStyle}>
        <div style={chatHeaderStyle}>COMMS</div>
        <div style={chatMessagesStyle}>
          {chatMessages.map((msg, i) => (
            <div key={i} style={chatMsgStyle}>
              <span style={chatNameStyle}>{msg.playerName}:</span>{' '}
              <span>{msg.message}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div style={chatInputRowStyle}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleChat()}
            placeholder="Type message..."
            style={chatInputStyle}
            maxLength={120}
          />
          <button className="btn-primary" onClick={handleChat} style={chatSendBtnStyle}>
            SEND
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
  alignItems: 'center',
  background: '#06080e',
  padding: '24px',
  gap: '12px',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  textAlign: 'center',
};

const headerLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.8rem',
  fontWeight: 700,
  letterSpacing: '0.25em',
  color: 'rgba(0, 240, 255, 0.5)',
  textTransform: 'uppercase',
};

const roomCodeContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
};

const roomCodeLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.6rem',
  color: 'rgba(255, 255, 255, 0.3)',
  letterSpacing: '0.2em',
};

const roomCodeRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const roomCodeStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '2.2rem',
  fontWeight: 700,
  color: '#00f0ff',
  letterSpacing: '0.35em',
  textShadow: '0 0 12px rgba(0, 240, 255, 0.5)',
};

const copyBtnStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.65rem',
  padding: '4px 10px',
  background: 'rgba(0, 240, 255, 0.1)',
  border: '1px solid rgba(0, 240, 255, 0.3)',
  color: '#00f0ff',
  cursor: 'pointer',
  letterSpacing: '0.1em',
};

const playerCountStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.7rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.4)',
  letterSpacing: '0.15em',
};

const playerListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  width: '100%',
  maxWidth: '480px',
  flex: '0 1 auto',
};

const playerCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 16px',
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
};

const readyDotStyle: React.CSSProperties = {
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  flexShrink: 0,
  transition: 'all 0.3s ease',
};

const playerInfoStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const playerNameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.95rem',
  fontWeight: 600,
  color: '#eee',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const hostBadgeStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.55rem',
  padding: '1px 6px',
  background: 'rgba(255, 170, 0, 0.15)',
  border: '1px solid rgba(255, 170, 0, 0.4)',
  color: '#ffaa00',
  letterSpacing: '0.1em',
};

const roleLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.65rem',
  letterSpacing: '0.15em',
};

const statusTextStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.65rem',
  color: 'rgba(255, 255, 255, 0.35)',
  letterSpacing: '0.1em',
};

const actionRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginTop: '4px',
};

const chatContainerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '480px',
  flex: '1 1 0',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  background: 'rgba(0, 0, 0, 0.3)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  marginTop: '8px',
};

const chatHeaderStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.6rem',
  fontWeight: 700,
  letterSpacing: '0.2em',
  color: 'rgba(0, 240, 255, 0.4)',
  padding: '6px 12px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
};

const chatMessagesStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '8px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  minHeight: '60px',
  maxHeight: '140px',
};

const chatMsgStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.72rem',
  color: 'rgba(255, 255, 255, 0.6)',
  lineHeight: 1.4,
};

const chatNameStyle: React.CSSProperties = {
  color: '#00f0ff',
  fontWeight: 600,
};

const chatInputRowStyle: React.CSSProperties = {
  display: 'flex',
  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
};

const chatInputStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  background: 'transparent',
  border: 'none',
  color: '#eee',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
  outline: 'none',
};

const chatSendBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: '0.65rem',
};

export default LobbyScreen;
