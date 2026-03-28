// ===== STATIC ORBIT — Cipher Break Puzzle =====

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../hooks/useSocket';
import { useGameStore } from '../../stores/gameStore';

interface PuzzleProps {
  roleData: Record<string, unknown>;
  role: 'observer' | 'operator' | 'navigator' | 'hacker';
}

// --- Shared Styles ---

const containerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 800,
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
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.015) 2px, rgba(0,240,255,0.015) 4px)',
  pointerEvents: 'none',
  zIndex: 1,
};

const cornerDecor = (position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 12,
    height: 12,
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

// ===== OBSERVER VIEW =====

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const cipherTable = roleData.cipherTable as Array<{ symbol: string; letter: string }>;

  return (
    <div style={containerStyle}>
      <div style={panelStyle}>
        <div style={scanlineOverlay} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={headerStyle}>
          <div style={{ marginBottom: 4 }}>/// 暗号キー ///</div>
          <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.5)', letterSpacing: 2 }}>
            変換表 -- オペレーターに伝えてください
          </div>
        </div>

        {/* Cipher Grid */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          justifyContent: 'center',
          position: 'relative',
          zIndex: 3,
        }}>
          {cipherTable.map((entry, i) => {
            const isDummy = 'XZQJW'.includes(entry.letter);
            return (
              <motion.div
                key={`${entry.symbol}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: isDummy ? 0.4 : 1 }}
                transition={{ delay: i * 0.06, duration: 0.3, type: 'tween' }}
                style={{
                  width: 72,
                  minHeight: 90,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  background: isDummy
                    ? 'rgba(255,255,255,0.02)'
                    : 'linear-gradient(180deg, rgba(0,240,255,0.06) 0%, rgba(0,240,255,0.02) 100%)',
                  border: isDummy
                    ? '1px solid rgba(255,255,255,0.08)'
                    : '1px solid rgba(0,240,255,0.2)',
                  padding: '10px 6px',
                  position: 'relative',
                }}
              >
                {/* Corner ticks */}
                <div style={{
                  position: 'absolute', top: 2, left: 2, width: 6, height: 6,
                  borderTop: `1px solid ${isDummy ? 'rgba(255,255,255,0.1)' : 'rgba(0,240,255,0.3)'}`,
                  borderLeft: `1px solid ${isDummy ? 'rgba(255,255,255,0.1)' : 'rgba(0,240,255,0.3)'}`,
                }} />
                <div style={{
                  position: 'absolute', top: 2, right: 2, width: 6, height: 6,
                  borderTop: `1px solid ${isDummy ? 'rgba(255,255,255,0.1)' : 'rgba(0,240,255,0.3)'}`,
                  borderRight: `1px solid ${isDummy ? 'rgba(255,255,255,0.1)' : 'rgba(0,240,255,0.3)'}`,
                }} />

                {/* Symbol */}
                <div style={{
                  fontSize: 30,
                  lineHeight: 1,
                  color: isDummy ? 'rgba(255,255,255,0.25)' : '#fff',
                  textShadow: isDummy ? 'none' : '0 0 12px rgba(0,240,255,0.5)',
                  userSelect: 'none',
                }}>
                  {entry.symbol}
                </div>

                {/* Divider */}
                <div style={{
                  width: '60%',
                  height: 1,
                  background: isDummy
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,240,255,0.2)',
                }} />

                {/* Letter */}
                <div style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: isDummy ? 'rgba(255,255,255,0.2)' : '#00f0ff',
                  textShadow: isDummy ? 'none' : '0 0 8px rgba(0,240,255,0.5)',
                  letterSpacing: 2,
                }}>
                  {entry.letter}
                </div>

                {/* Dummy indicator */}
                {isDummy && (
                  <div style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 4,
                    fontSize: 8,
                    color: 'rgba(255,100,100,0.3)',
                    letterSpacing: 1,
                  }}>
                    ダミー
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 20,
          padding: '8px 12px',
          background: 'rgba(0,240,255,0.04)',
          border: '1px solid rgba(0,240,255,0.1)',
          fontSize: 10,
          color: 'rgba(0,240,255,0.4)',
          textAlign: 'center',
          letterSpacing: 1,
        }}>
          暗号表に{cipherTable.length}個のシンボル -- 口頭で伝達してください
        </div>
      </div>
    </div>
  );
}

// ===== OPERATOR VIEW =====

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const encryptedSequence = roleData.encryptedSequence as string[];
  const targetLength = roleData.targetLength as number;
  const hasSpaces = roleData.hasSpaces as boolean;
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(() => {
    if (!answer.trim()) return;
    setIsSubmitting(true);

    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'cipher-break',
      action: 'submit-decode',
      data: { decoded: answer.trim() },
    });

    setTimeout(() => setIsSubmitting(false), 500);
  }, [answer]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div style={containerStyle}>
      <div style={{
        ...panelStyle,
        background: 'linear-gradient(135deg, rgba(10,0,20,0.95) 0%, rgba(20,0,30,0.9) 100%)',
        border: '1px solid rgba(255,0,100,0.25)',
      }}>
        <div style={scanlineOverlay} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={{
          ...headerStyle,
          color: '#ff0066',
          borderBottomColor: 'rgba(255,0,102,0.2)',
        }}>
          <div style={{ marginBottom: 4 }}>/// 解読端末 ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,0,102,0.5)', letterSpacing: 2 }}>
            暗号化されたシーケンスを解読せよ
          </div>
        </div>

        {/* Feedback Display */}
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
                background: lastFeedback.correct
                  ? 'rgba(51,255,102,0.1)'
                  : 'rgba(255,51,51,0.1)',
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

        {/* Encrypted Sequence Display */}
        <div style={{ position: 'relative', zIndex: 3, marginBottom: 28 }}>
          <div style={{
            fontSize: 10,
            color: 'rgba(255,0,102,0.4)',
            letterSpacing: 2,
            marginBottom: 10,
            fontFamily: "'Orbitron', sans-serif",
          }}>
            暗号化信号:
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            justifyContent: 'center',
            padding: '16px 12px',
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,0,102,0.15)',
          }}>
            {encryptedSequence.map((sym, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                style={{
                  width: sym === ' ' ? 24 : 52,
                  height: 60,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: sym === ' '
                    ? 'transparent'
                    : 'linear-gradient(180deg, rgba(255,0,102,0.08) 0%, rgba(255,0,102,0.03) 100%)',
                  border: sym === ' '
                    ? 'none'
                    : '1px solid rgba(255,0,102,0.2)',
                  fontSize: 28,
                  color: '#fff',
                  textShadow: '0 0 12px rgba(255,0,102,0.5)',
                  userSelect: 'none',
                  position: 'relative',
                }}
              >
                {sym === ' ' ? '' : sym}
                {sym !== ' ' && (
                  <div style={{
                    position: 'absolute',
                    bottom: 2,
                    fontSize: 8,
                    color: 'rgba(255,0,102,0.3)',
                  }}>
                    {i + 1}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Metadata */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          marginBottom: 20,
          fontSize: 10,
          color: 'rgba(255,0,102,0.4)',
          letterSpacing: 1,
          position: 'relative',
          zIndex: 3,
        }}>
          <span>文字数: {targetLength}</span>
          {hasSpaces && <span>スペースを含む</span>}
        </div>

        {/* Input Terminal */}
        <div style={{
          position: 'relative',
          zIndex: 3,
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(51,255,102,0.2)',
          padding: 16,
        }}>
          <div style={{
            fontSize: 10,
            color: 'rgba(51,255,102,0.4)',
            letterSpacing: 2,
            marginBottom: 10,
            fontFamily: "'Orbitron', sans-serif",
          }}>
            解読結果 {'>'}_
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ color: '#33ff66', fontSize: 14 }}>$</span>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="解読テキストを入力..."
              spellCheck={false}
              autoComplete="off"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(51,255,102,0.3)',
                outline: 'none',
                color: '#33ff66',
                fontSize: 18,
                fontFamily: "'Share Tech Mono', monospace",
                letterSpacing: 3,
                padding: '6px 0',
                caretColor: '#33ff66',
              }}
            />
          </div>

          {/* Character count */}
          <div style={{
            marginTop: 8,
            fontSize: 10,
            color: answer.replace(/ /g, '').length === targetLength
              ? 'rgba(51,255,102,0.5)'
              : 'rgba(255,255,255,0.2)',
            letterSpacing: 1,
            transition: 'color 0.3s ease',
          }}>
            {answer.replace(/ /g, '').length} / {targetLength} 文字
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ position: 'relative', zIndex: 3, marginTop: 20, textAlign: 'center' }}>
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(255,0,102,0.3)' }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={!answer.trim() || isSubmitting}
            style={{
              background: answer.trim()
                ? 'linear-gradient(135deg, rgba(255,0,102,0.2) 0%, rgba(255,0,102,0.4) 100%)'
                : 'rgba(60,60,60,0.3)',
              border: `1px solid ${answer.trim() ? 'rgba(255,0,102,0.5)' : '#333'}`,
              color: answer.trim() ? '#ff0066' : '#555',
              padding: '10px 40px',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 13,
              letterSpacing: 4,
              cursor: answer.trim() ? 'pointer' : 'default',
              clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
              transition: 'all 0.3s ease',
            }}
          >
            {isSubmitting ? '...' : '解読'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN COMPONENT =====

export default function CipherBreakPuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
