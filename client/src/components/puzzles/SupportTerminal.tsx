import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getSocket } from '../../hooks/useSocket';

/* ── Types ────────────────────────────────────────────────── */

interface SupportTerminalProps {
  role: 'navigator' | 'hacker';
  roleData: Record<string, unknown>;
}

/* ── Helpers ──────────────────────────────────────────────── */

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

/* ── Component ────────────────────────────────────────────── */

const SupportTerminal: React.FC<SupportTerminalProps> = ({ role, roleData }) => {
  const [chatInput, setChatInput] = useState('');

  const isNavigator = role === 'navigator';
  const accentColor = isNavigator ? '#33ff99' : '#ffaa00';
  const roleName = isNavigator ? 'ナビゲーター' : 'ハッカー';

  const handleChat = useCallback(() => {
    const msg = chatInput.trim();
    if (!msg) return;
    getSocket().emit('game:chat', { message: msg });
    setChatInput('');
  }, [chatInput]);

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
        <span style={{ ...headerIconStyle, color: accentColor }}>
          {isNavigator ? '\u25C8' : '\u25A0'}
        </span>
        <span style={{ ...headerTitleStyle, color: accentColor }}>
          {roleName}端末
        </span>
        <span style={headerSubStyle}>サポートモード</span>
      </motion.div>

      {/* Data readout */}
      <div style={dataContainerStyle}>
        {dataEntries.length === 0 ? (
          <div style={{ ...dataLineStyle, color: `${accentColor}88` }}>
            データフィード待機中...
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

      {/* Separator */}
      <div style={{ ...separatorStyle, borderTopColor: `${accentColor}22` }}>
        <span style={{ ...separatorLabelStyle, color: `${accentColor}66` }}>
          通信チャネル
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
          placeholder={`チームに情報を送信...`}
          style={{ ...inputStyle, caretColor: accentColor }}
          maxLength={120}
        />
        <button onClick={handleChat} style={{ ...sendBtnStyle, color: accentColor }}>
          送信
        </button>
      </div>
    </div>
  );
};

/* ── Styles ────────────────────────────────────────────────── */

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
  fontSize: '0.6rem',
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
  minHeight: '120px',
  maxHeight: '340px',
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

export default SupportTerminal;
