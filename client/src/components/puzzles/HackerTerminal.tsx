import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../hooks/useSocket';
import { useGameStore } from '../../stores/gameStore';

/* -- Types ------------------------------------------------ */

interface HackerTerminalProps {
  roleData: Record<string, unknown>;
}

/* -- Helpers ---------------------------------------------- */

function formatValue(value: unknown, indent: number = 0): string {
  const pad = '  '.repeat(indent);
  if (value === null || value === undefined) return `${pad}NULL`;
  if (typeof value === 'string') return `${pad}${value}`;
  if (typeof value === 'number' || typeof value === 'boolean') return `${pad}${String(value)}`;
  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}[ EMPTY ]`;
    return value.map((v, i) => `${pad}[${i}] ${formatValue(v, 0)}`).join('\n');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return `${pad}{ EMPTY }`;
    return entries.map(([k, v]) => {
      const fv = formatValue(v, indent + 1);
      const isMultiline = fv.includes('\n');
      return `${pad}${k.toUpperCase()}:${isMultiline ? '\n' + fv : ' ' + fv.trimStart()}`;
    }).join('\n');
  }
  return `${pad}${String(value)}`;
}

const ATTACK_TYPE_JP: Record<string, string> = {
  'timer-drain': '\u30BF\u30A4\u30DE\u30FC\u30C9\u30EC\u30A4\u30F3 (-10\u79D2)',
  'screen-noise': '\u30B9\u30AF\u30EA\u30FC\u30F3\u30CE\u30A4\u30BA',
  'input-scramble': '\u5165\u529B\u30B9\u30AF\u30E9\u30F3\u30D6\u30EB',
};

const SCAN_RESULT_JP: Record<string, { label: string; color: string }> = {
  hot: { label: 'HOT', color: '#ff4444' },
  warm: { label: 'WARM', color: '#ffaa00' },
  cold: { label: 'COLD', color: '#4488ff' },
  unavailable: { label: 'N/A', color: '#666666' },
};

/* -- Component -------------------------------------------- */

const HackerTerminal: React.FC<HackerTerminalProps> = ({ roleData }) => {
  const [chatInput, setChatInput] = useState('');
  const [defenseInput, setDefenseInput] = useState('');
  const [attackCountdown, setAttackCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const roomCode = useGameStore((s) => s.roomCode);
  const echoAttack = useGameStore((s) => s.echoAttack);
  const attackLog = useGameStore((s) => s.attackLog);
  const scanResults = useGameStore((s) => s.scanResults);
  const scansRemaining = useGameStore((s) => s.scansRemaining);

  const accentColor = '#ffaa00';

  // Countdown timer for active attack
  useEffect(() => {
    if (echoAttack && echoAttack.defenseCode) {
      setAttackCountdown(echoAttack.duration);
      setDefenseInput('');
      countdownRef.current = setInterval(() => {
        setAttackCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setAttackCountdown(0);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [echoAttack]);

  const handleChat = useCallback(() => {
    const msg = chatInput.trim();
    if (!msg) return;
    getSocket().emit('game:chat', { message: msg });
    setChatInput('');
  }, [chatInput]);

  const handleDefend = useCallback(() => {
    if (!roomCode || !defenseInput.trim()) return;
    getSocket().emit('game:defendAttack', { roomCode, defenseCode: defenseInput.trim() });
    setDefenseInput('');
  }, [roomCode, defenseInput]);

  const handleScan = useCallback(() => {
    if (!roomCode || scansRemaining <= 0) return;
    getSocket().emit('game:scan', { roomCode });
  }, [roomCode, scansRemaining]);

  const dataEntries = Object.entries(roleData);

  const hasActiveAttack = echoAttack && echoAttack.defenseCode && attackCountdown > 0;

  return (
    <div style={{ ...containerStyle, borderColor: `${accentColor}33` }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{ ...headerStyle, borderBottomColor: `${accentColor}33` }}
      >
        <span style={{ ...headerIconStyle, color: accentColor }}>{'\u25A0'}</span>
        <span style={{ ...headerTitleStyle, color: accentColor }}>
          {'\u30CF\u30C3\u30AB\u30FC\u7AEF\u672B'}
        </span>
        <span style={headerSubStyle}>
          ECHO{'\u8FEE\u6483 & \u30B7\u30B9\u30C6\u30E0\u30B9\u30AD\u30E3\u30F3'}
        </span>
      </motion.div>

      {/* ECHO Attack Alert */}
      <AnimatePresence>
        {hasActiveAttack && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            style={attackAlertStyle}
          >
            <div style={attackAlertHeaderStyle}>
              <span style={{ color: '#ff2244', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.1em' }}>
                {'\u26A0 ECHO\u653B\u6483\u691C\u77E5'}
              </span>
              <span style={{
                color: attackCountdown <= 3 ? '#ff2244' : '#ffaa00',
                fontWeight: 700,
                fontSize: '1rem',
                fontFamily: 'var(--font-mono)',
                textShadow: '0 0 8px currentColor',
              }}>
                {attackCountdown}s
              </span>
            </div>
            <div style={{ fontSize: '0.65rem', color: '#ffaa00cc', marginBottom: '6px' }}>
              {'\u653B\u6483\u30BF\u30A4\u30D7: '}{ATTACK_TYPE_JP[echoAttack!.attackType] ?? echoAttack!.attackType}
            </div>
            <div style={defenseInputRowStyle}>
              <span style={{ color: '#ff2244', fontSize: '0.7rem', fontWeight: 700 }}>{'\u9632\u5FA1\u30B3\u30FC\u30C9:'}</span>
              <input
                type="text"
                value={defenseInput}
                onChange={(e) => setDefenseInput(e.target.value.replace(/\D/g, '').slice(0, 3))}
                onKeyDown={(e) => e.key === 'Enter' && handleDefend()}
                placeholder="000"
                style={defenseInputStyle}
                maxLength={3}
                autoFocus
              />
              <button onClick={handleDefend} style={defendBtnStyle}>
                {'\u8FEE\u6483'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data readout */}
      <div style={dataContainerStyle}>
        {dataEntries.length === 0 ? (
          <div style={{ ...dataLineStyle, color: `${accentColor}88` }}>
            {'\u30C7\u30FC\u30BF\u30D5\u30A3\u30FC\u30C9\u5F85\u6A5F\u4E2D...'}
          </div>
        ) : (
          dataEntries.map(([key, value]) => (
            <div key={key} style={dataBlockStyle}>
              <div style={{ ...dataKeyStyle, color: accentColor }}>
                {'> '}{key.toUpperCase().replace(/_/g, ' ')}
              </div>
              <pre style={{ ...dataValueStyle, color: `${accentColor}cc` }}>
                {formatValue(value, 1)}
              </pre>
            </div>
          ))
        )}
      </div>

      {/* Scan Section */}
      <div style={{ ...sectionStyle, borderTopColor: `${accentColor}22` }}>
        <div style={sectionHeaderStyle}>
          <span style={{ color: accentColor, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em' }}>
            {'\u25A0 \u30B9\u30AD\u30E3\u30F3\u30BB\u30AF\u30B7\u30E7\u30F3'}
          </span>
          <span style={{ color: `${accentColor}88`, fontSize: '0.6rem' }}>
            {'\u6B8B\u308A: '}{scansRemaining}/3
          </span>
        </div>

        {/* Scan results */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
          {scanResults.slice(-3).map((sr, i) => {
            const info = SCAN_RESULT_JP[sr.result] ?? SCAN_RESULT_JP['unavailable'];
            return (
              <motion.div
                key={sr.timestamp}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  padding: '4px 10px',
                  border: `1px solid ${info.color}`,
                  color: info.color,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textShadow: `0 0 6px ${info.color}`,
                  background: `${info.color}11`,
                }}
              >
                #{i + 1} {info.label}
              </motion.div>
            );
          })}
        </div>

        <button
          onClick={handleScan}
          disabled={scansRemaining <= 0}
          style={{
            ...scanBtnStyle,
            color: scansRemaining > 0 ? accentColor : '#666',
            borderColor: scansRemaining > 0 ? accentColor : '#444',
            cursor: scansRemaining > 0 ? 'pointer' : 'not-allowed',
            opacity: scansRemaining > 0 ? 1 : 0.5,
          }}
        >
          {'\u30B9\u30AD\u30E3\u30F3'}
        </button>
      </div>

      {/* Attack Log */}
      {attackLog.length > 0 && (
        <div style={{ ...sectionStyle, borderTopColor: `${accentColor}22` }}>
          <div style={{ color: `${accentColor}88`, fontSize: '0.6rem', letterSpacing: '0.08em', marginBottom: '4px' }}>
            {'\u653B\u6483\u5C65\u6B74'}
          </div>
          {attackLog.slice(-4).map((entry, i) => (
            <div key={entry.timestamp} style={{
              fontSize: '0.6rem',
              color: entry.defended ? '#33ff99' : '#ff4466',
              padding: '2px 0',
            }}>
              [{i + 1}] {ATTACK_TYPE_JP[entry.attackType] ?? entry.attackType}
              {' \u2014 '}{entry.defended ? '\u8FEE\u6483\u6210\u529F' : '\u8FEE\u6483\u5931\u6557'}
            </div>
          ))}
        </div>
      )}

      {/* Separator */}
      <div style={{ ...separatorStyle, borderTopColor: `${accentColor}22` }}>
        <span style={{ ...separatorLabelStyle, color: `${accentColor}66` }}>
          {'\u901A\u4FE1\u30C1\u30E3\u30CD\u30EB'}
        </span>
      </div>

      {/* Chat input */}
      <div style={chatRowStyle}>
        <span style={{ ...promptStyle, color: accentColor }}>{'>'}</span>
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleChat()}
          placeholder={'\u30C1\u30FC\u30E0\u306B\u60C5\u5831\u3092\u9001\u4FE1...'}
          style={{ ...inputStyle, caretColor: accentColor }}
          maxLength={120}
        />
        <button onClick={handleChat} style={{ ...sendBtnStyle, color: accentColor }}>
          {'\u9001\u4FE1'}
        </button>
      </div>
    </div>
  );
};

/* -- Styles ----------------------------------------------- */

const containerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '520px',
  display: 'flex',
  flexDirection: 'column',
  background: 'rgba(6, 8, 14, 0.95)',
  border: '1px solid',
  fontFamily: 'var(--font-mono)',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '12px 16px',
  borderBottom: '1px solid',
  background: 'rgba(0, 0, 0, 0.4)',
};

const headerIconStyle: React.CSSProperties = {
  fontSize: '1.1rem',
};

const headerTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.85rem',
  fontWeight: 700,
  letterSpacing: '0.15em',
  textShadow: '0 0 8px currentColor',
};

const headerSubStyle: React.CSSProperties = {
  marginLeft: 'auto',
  fontSize: '0.55rem',
  color: 'rgba(255, 255, 255, 0.25)',
  letterSpacing: '0.1em',
};

const attackAlertStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: 'rgba(255, 34, 68, 0.08)',
  borderBottom: '1px solid rgba(255, 34, 68, 0.3)',
};

const attackAlertHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '6px',
};

const defenseInputRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const defenseInputStyle: React.CSSProperties = {
  width: '60px',
  background: 'rgba(255, 34, 68, 0.1)',
  border: '1px solid rgba(255, 34, 68, 0.5)',
  color: '#ff4466',
  fontFamily: 'var(--font-mono)',
  fontSize: '1rem',
  fontWeight: 700,
  padding: '6px 10px',
  outline: 'none',
  textAlign: 'center',
  letterSpacing: '0.2em',
};

const defendBtnStyle: React.CSSProperties = {
  background: 'rgba(255, 34, 68, 0.15)',
  border: '1px solid #ff2244',
  color: '#ff4466',
  fontFamily: 'var(--font-display)',
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  padding: '6px 16px',
  cursor: 'pointer',
};

const dataContainerStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  overflowY: 'auto',
  minHeight: '80px',
  maxHeight: '200px',
};

const dataBlockStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const dataKeyStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textShadow: '0 0 6px currentColor',
};

const dataValueStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  lineHeight: 1.5,
  margin: 0,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const dataLineStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  fontStyle: 'italic',
};

const sectionStyle: React.CSSProperties = {
  borderTop: '1px solid',
  padding: '10px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '4px',
};

const scanBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid',
  fontFamily: 'var(--font-display)',
  fontSize: '0.65rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  padding: '8px 16px',
};

const separatorStyle: React.CSSProperties = {
  borderTop: '1px solid',
  padding: '6px 16px',
};

const separatorLabelStyle: React.CSSProperties = {
  fontSize: '0.55rem',
  letterSpacing: '0.15em',
};

const chatRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 16px 12px',
  background: 'rgba(0, 0, 0, 0.3)',
};

const promptStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: '0.85rem',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#eee',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
  padding: '6px 4px',
  outline: 'none',
  minHeight: '36px',
};

const sendBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid currentColor',
  fontFamily: 'var(--font-display)',
  fontSize: '0.6rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  padding: '6px 14px',
  cursor: 'pointer',
  opacity: 0.8,
  minHeight: '36px',
};

export default HackerTerminal;
