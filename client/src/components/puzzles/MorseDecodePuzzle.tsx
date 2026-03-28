// ===== STATIC ORBIT — Morse Decode Puzzle =====

import { useState, useCallback, useEffect, useRef } from 'react';
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
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.015) 2px, rgba(0,240,255,0.015) 4px)',
  pointerEvents: 'none',
  zIndex: 1,
};

const gridOverlay: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundImage:
    'linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)',
  backgroundSize: '20px 20px',
  pointerEvents: 'none',
  zIndex: 0,
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

/* ── Morse Visual Element ──────────────────────────────────── */

function MorseSymbol({ symbol, active }: { symbol: string; active: boolean }) {
  const isDot = symbol === '.';
  return (
    <motion.div
      animate={{
        background: active ? '#00f0ff' : isDot ? 'rgba(0,240,255,0.3)' : 'rgba(0,240,255,0.3)',
        boxShadow: active ? '0 0 12px rgba(0,240,255,0.8), 0 0 24px rgba(0,240,255,0.3)' : '0 0 0px transparent',
      }}
      transition={{ duration: 0.1 }}
      style={{
        width: isDot ? 12 : 36,
        height: 12,
        borderRadius: isDot ? '50%' : 2,
        display: 'inline-block',
      }}
    />
  );
}

/* ── Observer View ─────────────────────────────────────────── */

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const morseSequence = roleData.morseSequence as string;
  const playbackSpeed = roleData.playbackSpeed as number;
  const showLetters = roleData.showLetters as boolean | undefined;
  const morseGroups = roleData.morseGroups as Array<{ letter: string; morse: string }> | undefined;

  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [lightOn, setLightOn] = useState(false);
  const playingRef = useRef(false);

  // Build flat symbol list for animation
  const symbols: Array<{ char: string; type: 'dot' | 'dash' | 'space' | 'letterGap' }> = [];
  const chars = morseSequence.split('');
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === '.') symbols.push({ char: '.', type: 'dot' });
    else if (chars[i] === '-') symbols.push({ char: '-', type: 'dash' });
    else if (chars[i] === ' ') {
      // Check if it's a word gap (multiple spaces) or letter gap
      symbols.push({ char: ' ', type: 'letterGap' });
    }
  }

  const handlePlay = useCallback(() => {
    if (playingRef.current) return;
    playingRef.current = true;
    setIsPlaying(true);
    setActiveIndex(-1);
    setLightOn(false);

    const baseTime = Math.max(60, 200 - playbackSpeed * 6); // ms per unit

    let idx = 0;
    const advance = () => {
      if (idx >= symbols.length || !playingRef.current) {
        playingRef.current = false;
        setIsPlaying(false);
        setActiveIndex(-1);
        setLightOn(false);
        return;
      }

      const sym = symbols[idx];
      setActiveIndex(idx);

      if (sym.type === 'dot') {
        setLightOn(true);
        setTimeout(() => {
          setLightOn(false);
          idx++;
          setTimeout(advance, baseTime);
        }, baseTime);
      } else if (sym.type === 'dash') {
        setLightOn(true);
        setTimeout(() => {
          setLightOn(false);
          idx++;
          setTimeout(advance, baseTime);
        }, baseTime * 3);
      } else {
        // Letter gap
        setLightOn(false);
        idx++;
        setTimeout(advance, baseTime * 3);
      }
    };

    advance();
  }, [symbols, playbackSpeed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      playingRef.current = false;
    };
  }, []);

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
          <div style={{ marginBottom: 4 }}>/// 傍受信号 ///</div>
          <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.5)', letterSpacing: 2 }}>
            解読して伝達せよ
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 3 }}>
          {/* Signal light */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <motion.div
              animate={{
                background: lightOn ? '#00f0ff' : 'rgba(0,240,255,0.08)',
                boxShadow: lightOn
                  ? '0 0 30px rgba(0,240,255,0.8), 0 0 60px rgba(0,240,255,0.4), 0 0 90px rgba(0,240,255,0.2)'
                  : '0 0 0px transparent',
              }}
              transition={{ duration: 0.05 }}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: '2px solid rgba(0,240,255,0.3)',
              }}
            />
          </div>

          {/* Morse text sequence */}
          <div style={{
            padding: '16px 20px',
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(0,240,255,0.15)',
            marginBottom: 16,
            textAlign: 'center',
            clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
          }}>
            <div style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 28,
              letterSpacing: 6,
              color: '#00f0ff',
              textShadow: '0 0 10px rgba(0,240,255,0.5)',
              wordBreak: 'break-all',
              lineHeight: 1.6,
            }}>
              {morseSequence}
            </div>
          </div>

          {/* Decoded letters (easy/normal only) */}
          {showLetters && morseGroups && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'center',
              marginBottom: 16,
              padding: '12px',
              background: 'rgba(51,255,102,0.04)',
              border: '1px solid rgba(51,255,102,0.15)',
            }}>
              {morseGroups.map((g, idx) => (
                <div key={idx} style={{
                  padding: '6px 10px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(51,255,102,0.2)',
                  textAlign: 'center',
                  minWidth: 60,
                }}>
                  <div style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 16,
                    color: 'rgba(0,240,255,0.7)',
                    letterSpacing: 3,
                    marginBottom: 4,
                  }}>
                    {g.morse}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: 'rgba(51,255,102,0.6)',
                    letterSpacing: 1,
                  }}>
                    = {g.letter}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Visual dots and dashes */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            justifyContent: 'center',
            marginBottom: 20,
            padding: '12px',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(0,240,255,0.1)',
          }}>
            {symbols.map((sym, idx) => {
              if (sym.type === 'letterGap') {
                return <div key={idx} style={{ width: 16 }} />;
              }
              return (
                <MorseSymbol
                  key={idx}
                  symbol={sym.char}
                  active={isPlaying && idx === activeIndex}
                />
              );
            })}
          </div>

          {/* Play button + speed */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
          }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePlay}
              disabled={isPlaying}
              style={{
                background: isPlaying
                  ? 'rgba(0,240,255,0.1)'
                  : 'linear-gradient(135deg, rgba(0,240,255,0.15), rgba(0,240,255,0.3))',
                border: '1px solid rgba(0,240,255,0.5)',
                color: isPlaying ? 'rgba(0,240,255,0.4)' : '#00f0ff',
                padding: '10px 28px',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 12,
                letterSpacing: 3,
                cursor: isPlaying ? 'default' : 'pointer',
                clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
              }}
            >
              {isPlaying ? '再生中...' : '再生'}
            </motion.button>

            <div style={{
              fontSize: 10,
              color: 'rgba(0,240,255,0.4)',
              letterSpacing: 1,
            }}>
              速度: {playbackSpeed} WPM
            </div>
          </div>
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
          position: 'relative',
          zIndex: 3,
        }}>
          モールス信号を傍受 -- 解読して口頭で伝達してください
        </div>
      </div>
    </div>
  );
}

/* ── Operator View ─────────────────────────────────────────── */

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const referenceChart = roleData.referenceChart as Record<string, string>;
  const targetLength = roleData.targetLength as number;
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [answer, setAnswer] = useState('');

  const handleSubmit = useCallback(() => {
    if (!answer.trim()) return;
    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'morse-decode',
      action: 'decode',
      data: { answer: answer.trim().toUpperCase() },
    });
  }, [answer]);

  // Build reference grid: letters A-Z then 0-9
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const digits = '0123456789'.split('');

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
          <div style={{ marginBottom: 4 }}>/// モールス解読端末 ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,0,102,0.5)', letterSpacing: 2 }}>
            傍受信号を解読せよ
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

        <div style={{ position: 'relative', zIndex: 3 }}>
          {/* Reference Chart - Letters */}
          <div style={{
            marginBottom: 16,
            padding: '12px',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,0,102,0.1)',
          }}>
            <div style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 9,
              letterSpacing: 2,
              color: 'rgba(255,0,102,0.4)',
              marginBottom: 8,
            }}>
              参照表
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: 4,
            }}>
              {letters.map((ch) => {
                const code = referenceChart[ch] ?? '???';
                const isMissing = code === '???';
                return (
                  <div key={ch} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 6px',
                    background: isMissing ? 'rgba(255,50,50,0.05)' : 'rgba(255,0,102,0.03)',
                    border: `1px solid ${isMissing ? 'rgba(255,50,50,0.15)' : 'rgba(255,0,102,0.08)'}`,
                  }}>
                    <span style={{
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: 11,
                      color: isMissing ? '#ff3333' : '#ff0066',
                      fontWeight: 'bold',
                      minWidth: 14,
                    }}>
                      {ch}
                    </span>
                    <span style={{
                      fontSize: 11,
                      color: isMissing ? 'rgba(255,50,50,0.5)' : 'rgba(255,255,255,0.6)',
                      letterSpacing: 2,
                    }}>
                      {code}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Digits row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
              gap: 4,
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px solid rgba(255,0,102,0.08)',
            }}>
              {digits.map((ch) => {
                const code = referenceChart[ch] ?? '???';
                const isMissing = code === '???';
                return (
                  <div key={ch} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 6px',
                    background: isMissing ? 'rgba(255,50,50,0.05)' : 'rgba(255,0,102,0.03)',
                    border: `1px solid ${isMissing ? 'rgba(255,50,50,0.15)' : 'rgba(255,0,102,0.08)'}`,
                  }}>
                    <span style={{
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: 11,
                      color: isMissing ? '#ff3333' : '#ff0066',
                      fontWeight: 'bold',
                      minWidth: 14,
                    }}>
                      {ch}
                    </span>
                    <span style={{
                      fontSize: 11,
                      color: isMissing ? 'rgba(255,50,50,0.5)' : 'rgba(255,255,255,0.6)',
                      letterSpacing: 2,
                    }}>
                      {code}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Answer Input */}
          <div style={{
            padding: '16px',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,0,102,0.15)',
            clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}>
              <span style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 10,
                letterSpacing: 2,
                color: 'rgba(255,0,102,0.5)',
              }}>
                解読メッセージ
              </span>
              <span style={{
                fontSize: 11,
                color: answer.length === targetLength ? '#33ff66' : 'rgba(255,255,255,0.4)',
                letterSpacing: 1,
              }}>
                {answer.length} / {targetLength}
              </span>
            </div>

            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              maxLength={targetLength + 5}
              placeholder={'_'.repeat(targetLength)}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,0,102,0.3)',
                color: '#ff0066',
                padding: '12px 16px',
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 24,
                letterSpacing: 8,
                textAlign: 'center',
                outline: 'none',
                textTransform: 'uppercase',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!answer.trim()}
                style={{
                  background: answer.trim()
                    ? 'linear-gradient(135deg, rgba(255,0,102,0.2), rgba(255,0,102,0.4))'
                    : 'rgba(60,60,60,0.3)',
                  border: `1px solid ${answer.trim() ? 'rgba(255,0,102,0.5)' : '#333'}`,
                  color: answer.trim() ? '#ff0066' : '#555',
                  padding: '10px 32px',
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 12,
                  letterSpacing: 3,
                  cursor: answer.trim() ? 'pointer' : 'default',
                  clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
                }}
              >
                送信
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */

export default function MorseDecodePuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
