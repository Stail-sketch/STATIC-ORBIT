import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { getSocket } from '../../hooks/useSocket';
import { useAudio } from '../../audio/useAudio';
import type { Role } from '@shared/types';

const MAX_PLAYERS = 4;

const ROLE_COLORS: Record<string, string> = {
  observer: '#00f0ff',
  operator: '#ff00aa',
  navigator: '#ffaa00',
  hacker: '#44ff88',
};

const ROLE_NAMES: Record<Role, string> = {
  observer: 'オブザーバー',
  operator: 'オペレーター',
  navigator: 'ナビゲーター',
  hacker: 'ハッカー',
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  observer: '情報を読み取り、仲間に伝える司令塔',
  operator: 'パズルを直接操作する実行役',
  navigator: '補助情報の分析とヒント検索を担当（3人以上）',
  hacker: 'ECHOの妨害を迎撃し、システムをスキャン（4人用）',
};

const ALL_ROLES: Role[] = ['observer', 'operator', 'navigator', 'hacker'];

function getRequiredRoles(playerCount: number): Role[] {
  if (playerCount <= 2) return ['observer', 'operator'];
  if (playerCount === 3) return ['observer', 'operator', 'navigator'];
  return ['observer', 'operator', 'navigator', 'hacker'];
}

const LobbyScreen: React.FC = () => {
  const roomCode = useGameStore((s) => s.roomCode);
  const players = useGameStore((s) => s.players);
  const playerId = useGameStore((s) => s.playerId);
  const isHost = useGameStore((s) => s.isHost);
  const chatMessages = useGameStore((s) => s.chatMessages);
  const gameMode = useGameStore((s) => s.gameMode);

  const audio = useAudio();

  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevPlayerCount = useRef(players.length);

  const me = players.find((p) => p.id === playerId);
  const requiredRoles = getRequiredRoles(players.length);
  const allRolesFilled = requiredRoles.every((role) => players.some((p) => p.role === role));
  const allReady = players.length >= 2 && players.every((p) => p.ready) && allRolesFilled;

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

  const handleSelectRole = useCallback((role: Role) => {
    audio.playSFX('click');
    getSocket().emit('room:selectRole', { role });
  }, [audio]);

  const handleChat = useCallback(() => {
    const msg = chatInput.trim();
    if (!msg) return;
    getSocket().emit('game:chat', { message: msg });
    setChatInput('');
  }, [chatInput]);

  // Determine who owns each role
  const roleOwners: Record<Role, { name: string; id: string } | null> = {
    observer: null,
    operator: null,
    navigator: null,
    hacker: null,
  };
  for (const p of players) {
    roleOwners[p.role] = { name: p.name, id: p.id };
  }

  return (
    <div style={screenStyle}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={headerStyle}
      >
        <span style={headerLabelStyle}>セキュアチャネル</span>
      </motion.div>

      {/* Room Code */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        style={roomCodeContainerStyle}
      >
        <span style={roomCodeLabelStyle}>ルームコード</span>
        <div style={roomCodeRowStyle}>
          <span style={roomCodeStyle}>{roomCode ?? '------'}</span>
          <button onClick={handleCopy} style={copyBtnStyle}>
            {copied ? 'コピー完了' : 'コピー'}
          </button>
        </div>
      </motion.div>

      {/* Game Mode Badge */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '0.15em',
          padding: '3px 12px',
          border: '1px solid',
          borderColor: gameMode === 'endless' ? 'rgba(255, 0, 170, 0.4)' : 'rgba(0, 240, 255, 0.3)',
          background: gameMode === 'endless' ? 'rgba(255, 0, 170, 0.08)' : 'rgba(0, 240, 255, 0.06)',
          color: gameMode === 'endless' ? '#ff00aa' : '#00f0ff',
        }}
      >
        {gameMode === 'endless' ? 'エンドレスモード' : 'ストーリーモード'}
      </div>

      {/* Player count */}
      <div style={playerCountStyle}>
        エージェント: {players.length}/{MAX_PLAYERS}
      </div>

      {/* Role Selection */}
      <div style={roleSectionStyle}>
        <div style={roleSectionHeaderStyle}>役職選択</div>
        <div style={roleGridStyle}>
          {ALL_ROLES.map((role) => {
            const color = ROLE_COLORS[role];
            const owner = roleOwners[role];
            const isMyRole = me?.role === role;
            const isTakenByOther = owner !== null && owner.id !== playerId;
            const isRequired = requiredRoles.includes(role);

            return (
              <motion.button
                key={role}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => !isTakenByOther && handleSelectRole(role)}
                style={{
                  ...roleCardStyle,
                  borderColor: isMyRole
                    ? color
                    : isTakenByOther
                      ? 'rgba(255, 255, 255, 0.06)'
                      : 'rgba(255, 255, 255, 0.12)',
                  boxShadow: isMyRole
                    ? `0 0 12px ${color}44, inset 0 0 20px ${color}11`
                    : 'none',
                  opacity: isTakenByOther ? 0.4 : 1,
                  cursor: isTakenByOther ? 'default' : 'pointer',
                  background: isMyRole
                    ? `linear-gradient(135deg, ${color}0a 0%, ${color}15 100%)`
                    : 'rgba(255, 255, 255, 0.02)',
                }}
              >
                <span style={{ ...roleCardNameStyle, color }}>{ROLE_NAMES[role]}</span>
                <span style={roleCardDescStyle}>{ROLE_DESCRIPTIONS[role]}</span>
                <span
                  style={{
                    ...roleCardOwnerStyle,
                    color: isMyRole ? color : isTakenByOther ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.2)',
                  }}
                >
                  {owner ? owner.name : isRequired ? '空き（必須）' : '空き'}
                </span>
              </motion.button>
            );
          })}
        </div>
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
                  {player.isHost && <span style={hostBadgeStyle}>ホスト</span>}
                </span>
                <span
                  style={{
                    ...roleLabelStyle,
                    color: ROLE_COLORS[player.role] ?? '#aaa',
                  }}
                >
                  {ROLE_NAMES[player.role as Role] ?? player.role.toUpperCase()}
                </span>
              </div>

              {/* Status */}
              <span style={statusTextStyle}>
                {player.ready ? '準備完了' : '待機中'}
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
          {me?.ready ? '準備取消' : '準備完了'}
        </button>

        {isHost && (
          <>
            <button
              className="btn-primary"
              onClick={handleStart}
              style={!allReady ? { opacity: 0.35, pointerEvents: 'none' } : undefined}
            >
              ミッション開始
            </button>
            {!allReady && (
              <div style={{ fontSize: 10, color: 'rgba(255,170,0,0.6)', letterSpacing: 1, marginTop: 4, textAlign: 'center' }}>
                {players.length < 2
                  ? '2人以上のエージェントが必要です'
                  : !allRolesFilled
                    ? '全ての必須役職にエージェントを配置してください'
                    : '全員の準備完了を待っています...'}
              </div>
            )}
          </>
        )}
      </div>

      {/* Chat area */}
      <div style={chatContainerStyle}>
        <div style={chatHeaderStyle}>通信</div>
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
            placeholder="メッセージを入力..."
            style={chatInputStyle}
            maxLength={120}
          />
          <button className="btn-primary" onClick={handleChat} style={chatSendBtnStyle}>
            送信
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
  gap: '10px',
  overflow: 'auto',
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

/* ── Role Selection ──────────────────────────────────────── */

const roleSectionStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '480px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const roleSectionHeaderStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.6rem',
  fontWeight: 700,
  letterSpacing: '0.2em',
  color: 'rgba(0, 240, 255, 0.4)',
  textTransform: 'uppercase',
};

const roleGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '8px',
};

const roleCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '4px',
  padding: '10px 14px',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
  transition: 'all 0.2s ease',
  textAlign: 'left',
  outline: 'none',
  fontFamily: 'inherit',
};

const roleCardNameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.8rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
};

const roleCardDescStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.55rem',
  color: 'rgba(255, 255, 255, 0.4)',
  letterSpacing: '0.05em',
  lineHeight: 1.4,
};

const roleCardOwnerStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.55rem',
  letterSpacing: '0.08em',
  marginTop: '2px',
};

/* ── Player List ─────────────────────────────────────────── */

const playerListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  width: '100%',
  maxWidth: '480px',
  flex: '0 1 auto',
};

const playerCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '10px 16px',
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
  fontSize: '0.9rem',
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
  fontSize: '0.6rem',
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
