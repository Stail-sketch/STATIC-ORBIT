// ===== STATIC ORBIT — Emotion Code Puzzle =====

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

/* ── Color / Emotion Maps ──────────────────────────────────── */

const COLOR_HEX: Record<string, string> = {
  red: '#ff3333',
  purple: '#aa33ff',
  yellow: '#ffdd33',
  blue: '#3388ff',
  orange: '#ff8833',
  green: '#33cc66',
  cyan: '#00f0ff',
  magenta: '#ff00aa',
};

const COLOR_JP: Record<string, string> = {
  red: '赤',
  purple: '紫',
  yellow: '黄',
  blue: '青',
  orange: '橙',
  green: '緑',
  cyan: 'シアン',
  magenta: 'マゼンタ',
};

const EMOTION_ICON: Record<string, string> = {
  '怒り': '\u{1F620}',
  '恐怖': '\u{1F628}',
  '喜び': '\u{1F604}',
  '悲しみ': '\u{1F622}',
  '驚き': '\u{1F632}',
  '嫌悪': '\u{1F922}',
  '平穏': '\u{1F60C}',
  '興奮': '\u{1F525}',
};

/* ── Observer View ─────────────────────────────────────────── */

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const sequence = roleData.sequence as Array<{
    emotion: string;
    color: string;
    symbol: string;
  }>;

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
          <div style={{ marginBottom: 4 }}>/// 感情コード シーケンス ///</div>
          <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.5)', letterSpacing: 2 }}>
            感情・色・シンボルの組み合わせをオペレーターに伝えてください
          </div>
        </div>

        <div style={{
          position: 'relative', zIndex: 3,
          display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap',
          paddingTop: 4,
        }}>
          {sequence.map((entry, i) => {
            const hex = COLOR_HEX[entry.color] || '#fff';
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                style={{
                  width: 110,
                  padding: 16,
                  background: 'rgba(0,0,0,0.4)',
                  border: `2px solid ${hex}60`,
                  textAlign: 'center',
                  clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                }}
              >
                {/* Position */}
                <div style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 9, letterSpacing: 2,
                  color: 'rgba(0,240,255,0.4)',
                  marginBottom: 8,
                }}>
                  #{i + 1}
                </div>

                {/* Emoji icon */}
                <div style={{ fontSize: 32, marginBottom: 6 }}>
                  {EMOTION_ICON[entry.emotion] || '?'}
                </div>

                {/* Emotion name */}
                <div style={{
                  fontSize: 14, fontWeight: 'bold',
                  color: hex,
                  textShadow: `0 0 8px ${hex}60`,
                  marginBottom: 6,
                }}>
                  {entry.emotion}
                </div>

                {/* Color indicator */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 6, marginBottom: 6,
                }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: hex,
                    boxShadow: `0 0 8px ${hex}80`,
                  }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                    {COLOR_JP[entry.color] || entry.color}
                  </span>
                </div>

                {/* Symbol */}
                <div style={{
                  fontSize: 20,
                  color: hex,
                  textShadow: `0 0 6px ${hex}40`,
                }}>
                  {entry.symbol}
                </div>
              </motion.div>
            );
          })}
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
          {sequence.length}個の感情コード -- 順番通りに口頭で伝達してください
        </div>
      </div>
    </div>
  );
}

/* ── Operator View ─────────────────────────────────────────── */

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const availableEmotions = roleData.availableEmotions as string[];
  const availableColors = roleData.availableColors as string[];
  const availableSymbols = roleData.availableSymbols as string[];
  const sequenceLength = roleData.sequenceLength as number;
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  // Deduplicate
  const emotions = [...new Set(availableEmotions)];
  const colors = [...new Set(availableColors)];
  const symbols = [...new Set(availableSymbols)];

  const [entries, setEntries] = useState(() =>
    Array.from({ length: sequenceLength }, () => ({
      emotion: '',
      color: '',
      symbol: '',
    }))
  );

  const updateEntry = useCallback((index: number, field: 'emotion' | 'color' | 'symbol', value: string) => {
    setEntries(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const handleSubmit = useCallback(() => {
    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'emotion-code',
      action: 'submit-emotions',
      data: { sequence: entries },
    });
  }, [entries]);

  const allFilled = entries.every(e => e.emotion && e.color && e.symbol);

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
          <div style={{ marginBottom: 4 }}>/// 感情コード 入力 ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,0,102,0.5)', letterSpacing: 2 }}>
            各位置の感情・色・シンボルを選択せよ
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

        <div style={{ position: 'relative', zIndex: 3 }}>
          {entries.map((entry, i) => {
            const entryColor = entry.color ? (COLOR_HEX[entry.color] || '#ff0066') : '#ff0066';
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                style={{
                  padding: 16,
                  marginBottom: 10,
                  background: 'linear-gradient(90deg, rgba(255,0,102,0.04), rgba(255,0,102,0.08), rgba(255,0,102,0.04))',
                  borderLeft: `3px solid ${entryColor}80`,
                  clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                }}
              >
                <div style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 11, letterSpacing: 2,
                  color: 'rgba(255,0,102,0.6)',
                  marginBottom: 12,
                }}>
                  #{i + 1}
                </div>

                {/* Emotion Dropdown */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, letterSpacing: 1 }}>
                    感情
                  </div>
                  <select
                    value={entry.emotion}
                    onChange={(e) => updateEntry(i, 'emotion', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'rgba(0,0,0,0.6)',
                      border: '1px solid rgba(255,0,102,0.3)',
                      color: entry.emotion ? entryColor : 'rgba(255,0,102,0.4)',
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: 14,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="">-- 選択 --</option>
                    {emotions.map(em => (
                      <option key={em} value={em}>{EMOTION_ICON[em] || ''} {em}</option>
                    ))}
                  </select>
                </div>

                {/* Color Buttons */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: 1 }}>
                    色
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {colors.map(color => {
                      const hex = COLOR_HEX[color] || '#fff';
                      const selected = entry.color === color;
                      return (
                        <motion.button
                          key={color}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => updateEntry(i, 'color', color)}
                          style={{
                            width: 36, height: 28,
                            background: selected ? hex : `${hex}30`,
                            border: `2px solid ${selected ? hex : `${hex}50`}`,
                            cursor: 'pointer',
                            boxShadow: selected ? `0 0 12px ${hex}80` : 'none',
                            transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 0,
                          }}
                          title={COLOR_JP[color] || color}
                        >
                          {selected && (
                            <span style={{ fontSize: 12, color: '#000', fontWeight: 'bold' }}>&#10003;</span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Symbol Buttons */}
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: 1 }}>
                    シンボル
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {symbols.map(sym => {
                      const selected = entry.symbol === sym;
                      return (
                        <motion.button
                          key={sym}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => updateEntry(i, 'symbol', sym)}
                          style={{
                            width: 36, height: 32,
                            background: selected ? 'rgba(255,0,102,0.3)' : 'rgba(255,0,102,0.06)',
                            border: `1px solid ${selected ? 'rgba(255,0,102,0.6)' : 'rgba(255,0,102,0.2)'}`,
                            color: selected ? '#ff0066' : 'rgba(255,0,102,0.5)',
                            cursor: 'pointer',
                            fontSize: 16,
                            fontFamily: "'Share Tech Mono', monospace",
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 0,
                            textShadow: selected ? '0 0 8px rgba(255,0,102,0.4)' : 'none',
                          }}
                        >
                          {sym}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
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
            送信
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */

export default function EmotionCodePuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
