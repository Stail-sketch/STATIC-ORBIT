// ===== STATIC ORBIT — Memory Chain Puzzle =====

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

/* ── Observer View ─────────────────────────────────────────── */

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const panels = roleData.panels as string[];
  const sequence = roleData.sequence as string[];
  const displayTime = roleData.displayTime as number;
  const gridCols = roleData.gridCols as number;

  const [isPlaying, setIsPlaying] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [playbackDone, setPlaybackDone] = useState(false);
  const playingRef = useRef(false);

  const handlePlay = useCallback(() => {
    if (playingRef.current) return;
    playingRef.current = true;
    setIsPlaying(true);
    setActivePanel(null);
    setPlaybackDone(false);

    let idx = 0;
    const advance = () => {
      if (idx >= sequence.length || !playingRef.current) {
        playingRef.current = false;
        setIsPlaying(false);
        setActivePanel(null);
        setPlaybackDone(true);
        return;
      }

      setActivePanel(sequence[idx]);
      idx++;

      setTimeout(() => {
        setActivePanel(null);
        setTimeout(advance, displayTime * 0.3);
      }, displayTime);
    };

    advance();
  }, [sequence, displayTime]);

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
          <div style={{ marginBottom: 4 }}>/// セキュリティパターン ///</div>
          <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.5)', letterSpacing: 2 }}>
            記憶して伝達せよ
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 3 }}>
          {/* Sequence info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            marginBottom: 20,
          }}>
            <div style={{
              padding: '6px 16px',
              background: 'rgba(0,240,255,0.06)',
              border: '1px solid rgba(0,240,255,0.2)',
              fontSize: 12,
              color: '#00f0ff',
              letterSpacing: 2,
            }}>
              シーケンス: {sequence.length}ステップ
            </div>
          </div>

          {/* Panel grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            gap: 8,
            maxWidth: gridCols * 80,
            margin: '0 auto 20px',
          }}>
            {panels.map((label) => {
              const isActive = activePanel === label;
              return (
                <motion.div
                  key={label}
                  animate={{
                    background: isActive
                      ? 'rgba(0,240,255,0.4)'
                      : 'rgba(0,240,255,0.05)',
                    borderColor: isActive
                      ? 'rgba(0,240,255,0.9)'
                      : 'rgba(0,240,255,0.15)',
                    boxShadow: isActive
                      ? '0 0 20px rgba(0,240,255,0.6), inset 0 0 20px rgba(0,240,255,0.2)'
                      : '0 0 0px transparent',
                  }}
                  transition={{ duration: 0.08 }}
                  style={{
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(0,240,255,0.15)',
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: 13,
                    color: isActive ? '#fff' : 'rgba(0,240,255,0.5)',
                    letterSpacing: 1,
                    clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                    userSelect: 'none',
                  }}
                >
                  {label}
                </motion.div>
              );
            })}
          </div>

          {/* Play button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
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
              {isPlaying ? '再生中...' : 'シーケンス再生'}
            </motion.button>
          </div>

          {/* Sequence text list (shown after playback) */}
          <AnimatePresence>
            {playbackDone && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                style={{
                  padding: '12px 16px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(0,240,255,0.15)',
                  clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
                }}
              >
                <div style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 9,
                  letterSpacing: 2,
                  color: 'rgba(0,240,255,0.4)',
                  marginBottom: 8,
                }}>
                  シーケンス順序
                </div>
                <div style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 16,
                  color: '#00f0ff',
                  textShadow: '0 0 8px rgba(0,240,255,0.4)',
                  letterSpacing: 2,
                  textAlign: 'center',
                  lineHeight: 1.8,
                }}>
                  {sequence.join(' \u2192 ')}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
          セキュリティパターン取得 -- 口頭で伝達してください
        </div>
      </div>
    </div>
  );
}

/* ── Operator View ─────────────────────────────────────────── */

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const panels = roleData.panels as string[];
  const sequenceLength = roleData.sequenceLength as number;
  const gridCols = roleData.gridCols as number;
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [inputSequence, setInputSequence] = useState<string[]>([]);

  const handlePanelClick = useCallback((label: string) => {
    if (inputSequence.length >= sequenceLength) return;
    setInputSequence(prev => [...prev, label]);
  }, [inputSequence.length, sequenceLength]);

  const handleUndo = useCallback(() => {
    setInputSequence(prev => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setInputSequence([]);
  }, []);

  const handleSubmit = useCallback(() => {
    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'memory-chain',
      action: 'submit-sequence',
      data: { sequence: inputSequence },
    });
  }, [inputSequence]);

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
          <div style={{ marginBottom: 4 }}>/// シーケンス入力パネル ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,0,102,0.5)', letterSpacing: 2 }}>
            セキュリティパターンを再現せよ
          </div>
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {lastFeedback && (
            <motion.div
              key={lastFeedback.feedback}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
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
          {/* Interactive panel grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            gap: 8,
            maxWidth: gridCols * 80,
            margin: '0 auto 20px',
          }}>
            {panels.map((label) => {
              const isLastClicked = inputSequence.length > 0 && inputSequence[inputSequence.length - 1] === label;
              return (
                <motion.button
                  key={label}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handlePanelClick(label)}
                  disabled={inputSequence.length >= sequenceLength}
                  style={{
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isLastClicked
                      ? 'rgba(255,0,102,0.3)'
                      : 'rgba(255,0,102,0.06)',
                    border: `1px solid ${isLastClicked ? 'rgba(255,0,102,0.7)' : 'rgba(255,0,102,0.2)'}`,
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: 13,
                    color: isLastClicked ? '#fff' : 'rgba(255,0,102,0.6)',
                    letterSpacing: 1,
                    cursor: inputSequence.length >= sequenceLength ? 'default' : 'pointer',
                    clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                    boxShadow: isLastClicked
                      ? '0 0 16px rgba(255,0,102,0.4), inset 0 0 16px rgba(255,0,102,0.15)'
                      : 'none',
                    transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
                  }}
                >
                  {label}
                </motion.button>
              );
            })}
          </div>

          {/* Input sequence display */}
          <div style={{
            padding: '12px 16px',
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,0,102,0.15)',
            marginBottom: 16,
            minHeight: 50,
            clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}>
              <span style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 9,
                letterSpacing: 2,
                color: 'rgba(255,0,102,0.4)',
              }}>
                入力シーケンス
              </span>
              <span style={{
                fontSize: 11,
                color: inputSequence.length === sequenceLength ? '#33ff66' : 'rgba(255,255,255,0.4)',
                letterSpacing: 1,
              }}>
                {inputSequence.length} / {sequenceLength}
              </span>
            </div>

            {inputSequence.length > 0 ? (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                alignItems: 'center',
              }}>
                {inputSequence.map((label, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      <span style={{
                        fontSize: 9,
                        color: 'rgba(255,0,102,0.3)',
                        fontFamily: "'Orbitron', sans-serif",
                      }}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span style={{
                        padding: '3px 8px',
                        background: 'rgba(255,0,102,0.15)',
                        border: '1px solid rgba(255,0,102,0.3)',
                        color: '#ff0066',
                        fontSize: 13,
                        fontFamily: "'Orbitron', sans-serif",
                        letterSpacing: 1,
                      }}>
                        {label}
                      </span>
                    </div>
                    {idx < inputSequence.length - 1 && (
                      <span style={{ color: 'rgba(255,0,102,0.3)', fontSize: 12 }}>{'\u2192'}</span>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div style={{
                color: 'rgba(255,255,255,0.2)',
                fontSize: 12,
                textAlign: 'center',
                padding: 8,
              }}>
                パネルをタップしてシーケンスを構築
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
          }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleUndo}
              disabled={inputSequence.length === 0}
              style={{
                background: inputSequence.length > 0
                  ? 'rgba(255,170,0,0.1)'
                  : 'rgba(60,60,60,0.2)',
                border: `1px solid ${inputSequence.length > 0 ? 'rgba(255,170,0,0.4)' : '#333'}`,
                color: inputSequence.length > 0 ? '#ffaa00' : '#555',
                padding: '8px 20px',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 10,
                letterSpacing: 2,
                cursor: inputSequence.length > 0 ? 'pointer' : 'default',
              }}
            >
              戻す
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClear}
              disabled={inputSequence.length === 0}
              style={{
                background: inputSequence.length > 0
                  ? 'rgba(255,51,51,0.1)'
                  : 'rgba(60,60,60,0.2)',
                border: `1px solid ${inputSequence.length > 0 ? 'rgba(255,51,51,0.4)' : '#333'}`,
                color: inputSequence.length > 0 ? '#ff3333' : '#555',
                padding: '8px 20px',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 10,
                letterSpacing: 2,
                cursor: inputSequence.length > 0 ? 'pointer' : 'default',
              }}
            >
              クリア
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={inputSequence.length !== sequenceLength}
              style={{
                background: inputSequence.length === sequenceLength
                  ? 'linear-gradient(135deg, rgba(255,0,102,0.2), rgba(255,0,102,0.4))'
                  : 'rgba(60,60,60,0.2)',
                border: `1px solid ${inputSequence.length === sequenceLength ? 'rgba(255,0,102,0.5)' : '#333'}`,
                color: inputSequence.length === sequenceLength ? '#ff0066' : '#555',
                padding: '8px 28px',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 11,
                letterSpacing: 3,
                cursor: inputSequence.length === sequenceLength ? 'pointer' : 'default',
                clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
              }}
            >
              送信
            </motion.button>
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginTop: 20, position: 'relative', zIndex: 3 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: 'rgba(255,0,102,0.4)',
            letterSpacing: 1,
            marginBottom: 6,
          }}>
            <span>シーケンス進捗</span>
            <span>{inputSequence.length} / {sequenceLength}</span>
          </div>
          <div style={{
            height: 4,
            background: 'rgba(255,0,102,0.1)',
            overflow: 'hidden',
          }}>
            <motion.div
              animate={{ width: `${(inputSequence.length / sequenceLength) * 100}%` }}
              transition={{ duration: 0.3 }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #ff0066, #00f0ff)',
                boxShadow: '0 0 8px rgba(255,0,102,0.4)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */

export default function MemoryChainPuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
