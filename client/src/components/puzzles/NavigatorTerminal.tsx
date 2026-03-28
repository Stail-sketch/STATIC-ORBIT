import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../hooks/useSocket';
import { useGameStore } from '../../stores/gameStore';

/* -- Types ------------------------------------------------ */

interface NavigatorTerminalProps {
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

/* -- Component -------------------------------------------- */

const NavigatorTerminal: React.FC<NavigatorTerminalProps> = ({ roleData }) => {
  const [chatInput, setChatInput] = useState('');
  const roomCode = useGameStore((s) => s.roomCode);
  const hints = useGameStore((s) => s.hints);
  const hintsRemaining = useGameStore((s) => s.hintsRemaining);

  const accentColor = '#33ff99';

  const handleChat = useCallback(() => {
    const msg = chatInput.trim();
    if (!msg) return;
    getSocket().emit('game:chat', { message: msg });
    setChatInput('');
  }, [chatInput]);

  const handleRequestHint = useCallback(() => {
    if (!roomCode || hintsRemaining <= 0) return;
    getSocket().emit('game:requestHint', { roomCode });
  }, [roomCode, hintsRemaining]);

  const dataEntries = Object.entries(roleData);

  return (
    <div style={{ ...containerStyle, borderColor: `${accentColor}33` }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{ ...headerStyle, borderBottomColor: `${accentColor}33` }}
      >
        <span style={{ ...headerIconStyle, color: accentColor }}>{'\u25C8'}</span>
        <span style={{ ...headerTitleStyle, color: accentColor }}>
          {'\u30CA\u30D3\u30B2\u30FC\u30BF\u30FC\u7AEF\u672B'}
        </span>
        <span style={headerSubStyle}>
          {'\u60C5\u5831\u5206\u6790 & \u30D2\u30F3\u30C8\u652F\u63F4'}
        </span>
      </motion.div>

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

      {/* Hint Database Section */}
      <div style={{ ...hintSectionStyle, borderTopColor: `${accentColor}22` }}>
        <div style={hintHeaderStyle}>
          <span style={{ color: accentColor, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em' }}>
            {'\u25C8 \u30D2\u30F3\u30C8\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9'}
          </span>
          <span style={{ color: `${accentColor}88`, fontSize: '0.6rem' }}>
            {'\u6B8B\u308A\u30D2\u30F3\u30C8: '}{hintsRemaining}/3
          </span>
        </div>

        {/* Received hints list */}
        <AnimatePresence>
          {hints.map((hint, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              style={hintItemStyle}
            >
              <span style={{ color: '#ffdd44', fontSize: '0.65rem' }}>
                [{i + 1}]
              </span>{' '}
              <span style={{ color: `${accentColor}dd`, fontSize: '0.68rem' }}>
                {hint}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Request hint button */}
        <button
          onClick={handleRequestHint}
          disabled={hintsRemaining <= 0}
          style={{
            ...hintBtnStyle,
            color: hintsRemaining > 0 ? accentColor : '#666',
            borderColor: hintsRemaining > 0 ? accentColor : '#444',
            cursor: hintsRemaining > 0 ? 'pointer' : 'not-allowed',
            opacity: hintsRemaining > 0 ? 1 : 0.5,
          }}
        >
          {'\u30D2\u30F3\u30C8\u691C\u7D22'}
          <span style={{ fontSize: '0.5rem', marginLeft: '8px', opacity: 0.7 }}>
            {'\u30B3\u30B9\u30C8: 5\u79D2'}
          </span>
        </button>
      </div>

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

const dataContainerStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  overflowY: 'auto',
  minHeight: '100px',
  maxHeight: '240px',
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

const hintSectionStyle: React.CSSProperties = {
  borderTop: '1px solid',
  padding: '10px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const hintHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '4px',
};

const hintItemStyle: React.CSSProperties = {
  padding: '4px 8px',
  background: 'rgba(51, 255, 153, 0.05)',
  borderLeft: '2px solid rgba(51, 255, 153, 0.3)',
  marginBottom: '2px',
};

const hintBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid',
  fontFamily: 'var(--font-display)',
  fontSize: '0.65rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  padding: '8px 16px',
  marginTop: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
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

export default NavigatorTerminal;
