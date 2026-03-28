// ===== STATIC ORBIT — Keycard Forge Puzzle =====

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../hooks/useSocket';
import { useGameStore } from '../../stores/gameStore';

interface PuzzleProps {
  roleData: Record<string, unknown>;
  role: 'observer' | 'operator' | 'navigator' | 'hacker';
}

/* ── Shared Styles ─────────────────────────────────────────── */

const containerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 820,
  margin: '0 auto',
  fontFamily: "'Share Tech Mono', 'Courier New', monospace",
  color: '#e0e0e0',
};

const panelStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(0,10,20,0.95) 0%, rgba(0,20,40,0.9) 100%)',
  border: '1px solid rgba(0,240,255,0.25)',
  borderRadius: 2,
  padding: 24,
  position: 'relative',
  overflow: 'hidden',
};

const operatorPanelStyle: React.CSSProperties = {
  ...panelStyle,
  background: 'linear-gradient(135deg, rgba(10,0,20,0.95) 0%, rgba(20,0,30,0.9) 100%)',
  border: '1px solid rgba(255,0,100,0.25)',
};

const headerStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', sans-serif",
  fontSize: 14,
  letterSpacing: 3,
  textTransform: 'uppercase' as const,
  color: '#00f0ff',
  textAlign: 'center' as const,
  marginBottom: 24,
  paddingBottom: 12,
  borderBottom: '1px solid rgba(0,240,255,0.2)',
};

const scanlineOverlay: React.CSSProperties = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.015) 2px, rgba(0,240,255,0.015) 4px)',
  pointerEvents: 'none',
  zIndex: 1,
};

const gridOverlay: React.CSSProperties = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundImage:
    'linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)',
  backgroundSize: '20px 20px',
  pointerEvents: 'none',
  zIndex: 0,
};

const cornerDecor = (position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 12, height: 12,
    borderColor: 'rgba(0,240,255,0.5)',
    borderStyle: 'solid',
    borderWidth: 0,
    zIndex: 2,
  };
  switch (position) {
    case 'topLeft': return { ...base, top: 4, left: 4, borderTopWidth: 2, borderLeftWidth: 2 };
    case 'topRight': return { ...base, top: 4, right: 4, borderTopWidth: 2, borderRightWidth: 2 };
    case 'bottomLeft': return { ...base, bottom: 4, left: 4, borderBottomWidth: 2, borderLeftWidth: 2 };
    case 'bottomRight': return { ...base, bottom: 4, right: 4, borderBottomWidth: 2, borderRightWidth: 2 };
  }
};

/* ── Observer View — ID Card Display ──────────────────────── */

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const fields = roleData.fields as Record<string, string>;
  const fieldNames = roleData.fieldNames as string[];

  return (
    <div style={containerStyle}>
      <div style={panelStyle}>
        <div style={scanlineOverlay} />
        <div style={gridOverlay} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={headerStyle}>
          <div style={{ marginBottom: 4 }}>/// キーカード 社員データ ///</div>
          <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.5)', letterSpacing: 2 }}>
            カード情報をオペレーターに伝えてください
          </div>
        </div>

        {/* Corporate ID Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'relative',
            zIndex: 3,
            maxWidth: 480,
            margin: '0 auto',
            background: 'linear-gradient(160deg, rgba(0,20,40,0.95), rgba(0,10,30,0.98))',
            border: '2px solid rgba(0,240,255,0.35)',
            padding: 0,
            clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
          }}
        >
          {/* Card Header Bar */}
          <div style={{
            background: 'linear-gradient(90deg, rgba(0,240,255,0.15), rgba(0,240,255,0.05))',
            borderBottom: '1px solid rgba(0,240,255,0.2)',
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 11,
              letterSpacing: 3,
              color: '#00f0ff',
            }}>
              STATIC ORBIT CORP.
            </div>
            <div style={{
              padding: '2px 10px',
              background: 'rgba(0,240,255,0.1)',
              border: '1px solid rgba(0,240,255,0.3)',
              fontSize: 9,
              color: '#00f0ff',
              letterSpacing: 2,
              fontFamily: "'Orbitron', sans-serif",
            }}>
              ACCESS CARD
            </div>
          </div>

          {/* Card Body */}
          <div style={{ padding: '20px 20px 24px' }}>
            {/* Photo placeholder + name area */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              {/* Photo placeholder */}
              <div style={{
                width: 64, height: 80,
                background: 'linear-gradient(135deg, rgba(0,240,255,0.06), rgba(0,240,255,0.02))',
                border: '1px solid rgba(0,240,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="32" height="32" viewBox="0 0 32 32">
                  <circle cx="16" cy="12" r="6" fill="none" stroke="rgba(0,240,255,0.3)" strokeWidth="1.5" />
                  <path d="M 6 30 Q 6 20 16 20 Q 26 20 26 30" fill="none" stroke="rgba(0,240,255,0.3)" strokeWidth="1.5" />
                </svg>
              </div>

              {/* Primary info */}
              <div style={{ flex: 1 }}>
                {fieldNames.includes('名前') && (
                  <div style={{
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: '#00f0ff',
                    textShadow: '0 0 10px rgba(0,240,255,0.4)',
                    marginBottom: 8,
                    letterSpacing: 2,
                  }}>
                    {fields['名前']}
                  </div>
                )}
                {fieldNames.includes('部署コード') && (
                  <div style={{
                    padding: '3px 10px',
                    background: 'rgba(0,240,255,0.08)',
                    border: '1px solid rgba(0,240,255,0.2)',
                    display: 'inline-block',
                    fontSize: 12,
                    color: 'rgba(0,240,255,0.8)',
                    letterSpacing: 2,
                  }}>
                    {fields['部署コード']}
                  </div>
                )}
              </div>
            </div>

            {/* Field rows */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
              {fieldNames.filter(n => n !== '名前' && n !== '部署コード').map((name, i) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.3 }}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(0,0,0,0.3)',
                    borderLeft: '2px solid rgba(0,240,255,0.3)',
                  }}
                >
                  <div style={{
                    fontSize: 9, color: 'rgba(0,240,255,0.4)',
                    letterSpacing: 1, marginBottom: 4,
                    fontFamily: "'Orbitron', sans-serif",
                  }}>
                    {name}
                  </div>
                  <div style={{
                    fontSize: 14, color: '#00f0ff',
                    fontWeight: 'bold',
                    textShadow: '0 0 6px rgba(0,240,255,0.3)',
                  }}>
                    {fields[name]}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Card Footer — barcode */}
          <div style={{
            borderTop: '1px solid rgba(0,240,255,0.15)',
            padding: '8px 20px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ display: 'flex', gap: 2, flex: 1 }}>
              {Array.from({ length: 30 }, (_, i) => (
                <div key={i} style={{
                  width: Math.random() > 0.5 ? 3 : 2,
                  height: 16,
                  background: `rgba(0,240,255,${0.15 + Math.random() * 0.15})`,
                }} />
              ))}
            </div>
            <span style={{ fontSize: 8, color: 'rgba(0,240,255,0.3)', letterSpacing: 1 }}>
              SO-2087
            </span>
          </div>
        </motion.div>

        <div style={{
          marginTop: 20,
          padding: '8px 12px',
          background: 'rgba(0,240,255,0.04)',
          border: '1px solid rgba(0,240,255,0.1)',
          fontSize: 10,
          color: 'rgba(0,240,255,0.4)',
          textAlign: 'center',
          letterSpacing: 1,
          position: 'relative',
          zIndex: 3,
        }}>
          {fieldNames.length}項目のカードデータ -- 口頭で伝達してください
        </div>
      </div>
    </div>
  );
}

/* ── Operator View — Forge Form ───────────────────────────── */

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const fieldNames = roleData.fieldNames as string[];
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const name of fieldNames) init[name] = '';
    return init;
  });

  const handleChange = useCallback((name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'keycard-forge',
      action: 'forge',
      data: { fields: formData },
    });
  }, [formData]);

  const allFilled = fieldNames.every(name => formData[name].trim() !== '');

  return (
    <div style={containerStyle}>
      <div style={operatorPanelStyle}>
        <div style={scanlineOverlay} />
        <div style={gridOverlay} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={{ ...headerStyle, color: '#ff0066', borderBottomColor: 'rgba(255,0,102,0.2)' }}>
          <div style={{ marginBottom: 4 }}>/// キーカード偽造端末 ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,0,102,0.5)', letterSpacing: 2 }}>
            各フィールドを正確に入力せよ
          </div>
        </div>

        <AnimatePresence>
          {lastFeedback && (
            <motion.div
              key={lastFeedback.feedback}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'tween', duration: 0.2 }}
              style={{
                padding: '8px 16px',
                marginBottom: 16,
                textAlign: 'center',
                fontSize: 12,
                letterSpacing: 1,
                background: lastFeedback.correct ? 'rgba(51,255,102,0.1)' : 'rgba(255,51,51,0.1)',
                border: `1px solid ${lastFeedback.correct ? 'rgba(51,255,102,0.3)' : 'rgba(255,51,51,0.3)'}`,
                color: lastFeedback.correct ? '#33ff66' : '#ff3333',
                position: 'relative',
                zIndex: 3,
              }}
            >
              {lastFeedback.feedback}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Fields */}
        <div style={{ position: 'relative', zIndex: 3 }}>
          {fieldNames.map((name, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              style={{
                marginBottom: 12,
                padding: '12px 16px',
                background: 'linear-gradient(90deg, rgba(255,0,102,0.04), rgba(255,0,102,0.08), rgba(255,0,102,0.04))',
                borderLeft: '3px solid rgba(255,0,102,0.5)',
                clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
              }}
            >
              <label style={{
                display: 'block',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 10,
                letterSpacing: 2,
                color: 'rgba(255,0,102,0.6)',
                marginBottom: 8,
              }}>
                {name}
              </label>
              <input
                type="text"
                value={formData[name]}
                onChange={(e) => handleChange(name, e.target.value)}
                placeholder={`${name}を入力...`}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,0,102,0.25)',
                  color: '#ff0066',
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 16,
                  outline: 'none',
                  letterSpacing: 1,
                  caretColor: '#ff0066',
                  boxSizing: 'border-box',
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, position: 'relative', zIndex: 3 }}>
          <motion.button
            whileHover={allFilled ? { scale: 1.05, boxShadow: '0 0 20px rgba(255,0,102,0.4)' } : {}}
            whileTap={allFilled ? { scale: 0.98 } : {}}
            onClick={handleSubmit}
            disabled={!allFilled}
            style={{
              background: allFilled
                ? 'linear-gradient(135deg, rgba(255,0,102,0.3), rgba(255,0,102,0.5))'
                : 'rgba(255,0,102,0.1)',
              border: `1px solid ${allFilled ? 'rgba(255,0,102,0.6)' : 'rgba(255,0,102,0.2)'}`,
              color: allFilled ? '#ff0066' : 'rgba(255,0,102,0.3)',
              padding: '12px 40px',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 14,
              letterSpacing: 4,
              cursor: allFilled ? 'pointer' : 'default',
              clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
              textShadow: allFilled ? '0 0 8px rgba(255,0,102,0.4)' : 'none',
            }}
          >
            偽造
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */

export default function KeycardForgePuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
