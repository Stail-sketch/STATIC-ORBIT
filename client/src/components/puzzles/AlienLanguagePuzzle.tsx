// ===== STATIC ORBIT — Alien Language Puzzle =====

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../hooks/useSocket';
import { useGameStore } from '../../stores/gameStore';

interface PuzzleProps {
  roleData: Record<string, unknown>;
  role: 'observer' | 'operator' | 'navigator' | 'hacker';
}

/* -- Shared Styles ------------------------------------------------ */

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

/* -- Observer View ------------------------------------------------ */

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const translationTable = roleData.translationTable as Record<string, string>;

  const entries = Object.entries(translationTable);

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
          <div style={{ marginBottom: 4 }}>/// 異星語翻訳テーブル ///</div>
          <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.5)', letterSpacing: 2 }}>
            オペレーターに翻訳を伝えてください
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 3 }}>
          {/* Translation grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(entries.length, 6)}, 1fr)`,
            gap: 10,
            marginBottom: 24,
          }}>
            {entries.map(([alien, hiragana], i) => (
              <motion.div
                key={alien}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '14px 8px 10px',
                  background: 'rgba(0,240,255,0.04)',
                  border: '1px solid rgba(0,240,255,0.15)',
                  clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                }}
              >
                <div style={{
                  fontSize: 32,
                  color: '#00f0ff',
                  textShadow: '0 0 12px rgba(0,240,255,0.6)',
                  marginBottom: 6,
                }}>
                  {alien}
                </div>
                <div style={{
                  fontSize: 14,
                  color: '#33ff66',
                  textShadow: '0 0 8px rgba(51,255,102,0.4)',
                  letterSpacing: 2,
                }}>
                  {hiragana}
                </div>
              </motion.div>
            ))}
          </div>

        </div>

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
          テーブルを参照し、各記号の平仮名を口頭で伝えてください
        </div>
      </div>
    </div>
  );
}

/* -- Operator View ------------------------------------------------ */

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const alienText = roleData.alienText as string;
  const phraseLength = roleData.phraseLength as number;
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [translation, setTranslation] = useState('');

  const handleSubmit = useCallback(() => {
    if (!translation.trim()) return;
    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'alien-language',
      action: 'translate',
      data: { translation: translation.trim() },
    });
  }, [translation]);

  return (
    <div style={containerStyle}>
      <div style={operatorPanelStyle}>
        <div style={scanlineOverlay} />
        <div style={gridOverlay} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={{
          ...headerStyle,
          color: '#ff0066',
          borderBottomColor: 'rgba(255,0,102,0.2)',
        }}>
          <div style={{ marginBottom: 4 }}>/// 異星語翻訳 ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,0,102,0.5)', letterSpacing: 2 }}>
            異星語を平仮名に翻訳せよ
          </div>
        </div>

        {/* Feedback */}
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

        <div style={{ position: 'relative', zIndex: 3 }}>
          {/* Alien text display */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '24px 20px',
              marginBottom: 24,
              background: 'rgba(255,0,102,0.04)',
              borderLeft: '3px solid rgba(255,0,102,0.5)',
              textAlign: 'center',
            }}
          >
            <div style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 10,
              color: 'rgba(255,0,102,0.5)',
              letterSpacing: 2,
              marginBottom: 12,
            }}>
              異星語テキスト ({phraseLength}文字)
            </div>
            <div style={{
              fontSize: 48,
              color: '#ff0066',
              textShadow: '0 0 20px rgba(255,0,102,0.5), 0 0 40px rgba(255,0,102,0.2)',
              letterSpacing: 16,
            }}>
              {alienText}
            </div>
          </motion.div>

          {/* Translation input */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
            <input
              type="text"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder={`平仮名で翻訳を入力 (${phraseLength}文字)`}
              style={{
                flex: 1,
                padding: '14px 18px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,0,102,0.3)',
                color: '#e0e0e0',
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 20,
                letterSpacing: 6,
                outline: 'none',
              }}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              style={{
                background: 'linear-gradient(135deg, rgba(255,0,102,0.2), rgba(255,0,102,0.4))',
                border: '1px solid rgba(255,0,102,0.5)',
                color: '#ff0066',
                padding: '14px 28px',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 13,
                letterSpacing: 3,
                cursor: 'pointer',
                clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
                whiteSpace: 'nowrap',
              }}
            >
              翻訳
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -- Main Component ----------------------------------------------- */

export default function AlienLanguagePuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
