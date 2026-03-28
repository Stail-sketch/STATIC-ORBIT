// ===== STATIC ORBIT — Number Crack Puzzle =====

import { useState, useCallback, useRef } from 'react';
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

/* ── Observer View ─────────────────────────────────────────── */

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const hints = roleData.hints as string[];
  const digitCount = roleData.digitCount as number;

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
          <div style={{ marginBottom: 4 }}>/// ナンバークラック 解析データ ///</div>
          <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.5)', letterSpacing: 2 }}>
            {digitCount}桁のコード -- ヒントをオペレーターに伝えてください
          </div>
        </div>

        <div style={{
          position: 'relative', zIndex: 3,
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(0,240,255,0.15)',
          padding: 16,
          fontFamily: "'Share Tech Mono', monospace",
        }}>
          {/* Terminal header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 16, paddingBottom: 8,
            borderBottom: '1px solid rgba(0,240,255,0.1)',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#33ff66' }} />
            <span style={{ fontSize: 10, color: 'rgba(0,240,255,0.4)', letterSpacing: 2 }}>
              DECRYPT_TERMINAL v2.4
            </span>
          </div>

          {/* Hints */}
          {hints.map((hint, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              style={{
                padding: '6px 0',
                borderBottom: '1px solid rgba(0,240,255,0.04)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <span style={{
                color: 'rgba(0,240,255,0.3)',
                fontSize: 10,
                minWidth: 20,
                textAlign: 'right',
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ color: '#00f0ff', fontSize: 11, letterSpacing: 1 }}>
                {'>'} {hint}
              </span>
            </motion.div>
          ))}

          {/* Blinking cursor */}
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: 'rgba(0,240,255,0.3)', fontSize: 10 }}>{'$'}</span>
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              style={{ display: 'inline-block', width: 8, height: 14, background: '#00f0ff' }}
            />
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
          {hints.length}個のヒントを検出 -- 口頭で伝達してください
        </div>
      </div>
    </div>
  );
}

/* ── Operator View ─────────────────────────────────────────── */

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const digitCount = roleData.digitCount as number;
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [digits, setDigits] = useState<string[]>(() => Array(digitCount).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDigitChange = useCallback((index: number, value: string) => {
    const char = value.slice(-1);
    if (char && !/^[0-9]$/.test(char)) return;

    setDigits(prev => {
      const next = [...prev];
      next[index] = char;
      return next;
    });

    // Auto-advance to next input
    if (char && index < digitCount - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [digitCount]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [digits]);

  const handleSubmit = useCallback(() => {
    const code = digits.join('');
    if (code.length !== digitCount) return;
    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'number-crack',
      action: 'crack',
      data: { code },
    });
  }, [digits, digitCount]);

  const allFilled = digits.every(d => d !== '');

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
          <div style={{ marginBottom: 4 }}>/// ナンバークラック 入力 ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,0,102,0.5)', letterSpacing: 2 }}>
            {digitCount}桁のコードを入力せよ
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

        {/* Digit Input Boxes */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 12,
          marginBottom: 32, position: 'relative', zIndex: 3,
        }}>
          {digits.map((d, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
            >
              <div style={{
                fontSize: 8, color: 'rgba(255,0,102,0.4)', textAlign: 'center',
                marginBottom: 4, fontFamily: "'Orbitron', sans-serif", letterSpacing: 1,
              }}>
                {i + 1}桁
              </div>
              <input
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                style={{
                  width: 52, height: 64,
                  textAlign: 'center',
                  fontSize: 32,
                  fontFamily: "'Orbitron', sans-serif",
                  fontWeight: 'bold',
                  color: d ? '#ff0066' : 'rgba(255,0,102,0.2)',
                  background: 'rgba(0,0,0,0.6)',
                  border: `2px solid ${d ? 'rgba(255,0,102,0.5)' : 'rgba(255,0,102,0.15)'}`,
                  outline: 'none',
                  caretColor: '#ff0066',
                  textShadow: d ? '0 0 12px rgba(255,0,102,0.5)' : 'none',
                  transition: 'border-color 0.2s, text-shadow 0.2s',
                  clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 3 }}>
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
            解除
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */

export default function NumberCrackPuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
