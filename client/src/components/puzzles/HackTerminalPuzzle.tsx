// ===== STATIC ORBIT — Hack Terminal Puzzle =====

import { useState, useCallback, useRef, useEffect } from 'react';
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

const scanlineOverlay: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.012) 2px, rgba(0,255,65,0.012) 4px)',
  pointerEvents: 'none',
  zIndex: 1,
};

const cornerDecor = (position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight', color: string): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 12,
    height: 12,
    borderColor: color,
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
  const commands = roleData.commands as string[];
  const displayTime = roleData.displayTime as number;

  return (
    <div style={containerStyle}>
      <div style={{
        background: '#0a0a0a',
        border: '1px solid rgba(0,255,65,0.3)',
        borderRadius: 2,
        padding: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={scanlineOverlay} />
        <div style={cornerDecor('topLeft', 'rgba(0,255,65,0.5)')} />
        <div style={cornerDecor('topRight', 'rgba(0,255,65,0.5)')} />
        <div style={cornerDecor('bottomLeft', 'rgba(0,255,65,0.5)')} />
        <div style={cornerDecor('bottomRight', 'rgba(0,255,65,0.5)')} />

        {/* Terminal title bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          background: 'rgba(0,255,65,0.06)',
          borderBottom: '1px solid rgba(0,255,65,0.15)',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff3b30' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffcc00' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#33ff66' }} />
          <span style={{
            marginLeft: 12,
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 10,
            letterSpacing: 3,
            color: 'rgba(0,255,65,0.5)',
          }}>
            注入コマンド -- オペレーターに口述せよ
          </span>
        </div>

        {/* Terminal body */}
        <div style={{
          padding: '20px 24px',
          position: 'relative',
          zIndex: 3,
          backgroundImage:
            'linear-gradient(rgba(0,255,65,0.015) 1px, transparent 1px)',
          backgroundSize: '100% 20px',
        }}>
          {/* System header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              color: 'rgba(0,255,65,0.3)',
              fontSize: 11,
              marginBottom: 16,
              lineHeight: 1.6,
            }}
          >
            <div>ARKTIS ORBITAL SYSTEMS v7.2.1</div>
            <div>ペイロード注入モジュール</div>
            <div>-----------------------------------</div>
            <div>コマンド表示時間: {displayTime}秒</div>
            <div>コマンド総数: {commands.length}</div>
            <div>-----------------------------------</div>
          </motion.div>

          {/* Command list */}
          {commands.map((cmd, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15, duration: 0.4 }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '10px 12px',
                marginBottom: 4,
                background: 'rgba(0,255,65,0.03)',
                borderLeft: '2px solid rgba(0,255,65,0.3)',
              }}
            >
              {/* Index number */}
              <span style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 10,
                color: 'rgba(0,255,65,0.4)',
                minWidth: 28,
                textAlign: 'right',
                flexShrink: 0,
                paddingTop: 2,
              }}>
                [{String(i + 1).padStart(2, '0')}]
              </span>

              {/* Prompt */}
              <span style={{
                color: 'rgba(0,255,65,0.5)',
                fontSize: 13,
                flexShrink: 0,
              }}>
                $
              </span>

              {/* Command */}
              <span style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 14,
                color: '#33ff66',
                textShadow: '0 0 6px rgba(0,255,65,0.3)',
                wordBreak: 'break-all',
                lineHeight: 1.4,
              }}>
                {cmd}
              </span>
            </motion.div>
          ))}

          {/* Blinking cursor line */}
          <motion.div
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
            style={{
              marginTop: 16,
              color: 'rgba(0,255,65,0.4)',
              fontSize: 13,
            }}
          >
            $ _
          </motion.div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 16px',
          background: 'rgba(0,255,65,0.03)',
          borderTop: '1px solid rgba(0,255,65,0.1)',
          fontSize: 10,
          color: 'rgba(0,255,65,0.3)',
          textAlign: 'center',
          letterSpacing: 1,
        }}>
          {commands.length}個のコマンド待機中 -- 正確な構文が必要
        </div>
      </div>
    </div>
  );
}

/* ── Operator View ─────────────────────────────────────────── */

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const commandCount = roleData.commandCount as number;
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [completedCommands, setCompletedCommands] = useState<Set<number>>(() => new Set());
  const [flashSuccess, setFlashSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentIndex]);

  // Track successful commands from feedback
  useEffect(() => {
    if (lastFeedback?.correct && lastFeedback.feedback?.includes('実行に成功')) {
      setCompletedCommands(prev => {
        const next = new Set(prev);
        next.add(currentIndex);
        return next;
      });

      // Flash effect
      setFlashSuccess(true);
      setTimeout(() => {
        setFlashSuccess(false);
        // Advance to next uncompleted command
        setCurrentIndex(prev => {
          for (let i = prev + 1; i < commandCount; i++) {
            if (!completedCommands.has(i)) return i;
          }
          return prev;
        });
        setUserInput('');
      }, 600);
    }
  }, [lastFeedback]);

  const handleSubmit = useCallback(() => {
    if (!userInput.trim()) return;
    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'hack-terminal',
      action: 'type-command',
      data: { index: currentIndex, input: userInput },
    });
  }, [currentIndex, userInput]);

  return (
    <div style={containerStyle}>
      <div style={{
        background: '#050505',
        border: '1px solid rgba(255,0,102,0.3)',
        borderRadius: 2,
        padding: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          ...scanlineOverlay,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,102,0.01) 2px, rgba(255,0,102,0.01) 4px)',
        }} />
        <div style={cornerDecor('topLeft', 'rgba(255,0,102,0.5)')} />
        <div style={cornerDecor('topRight', 'rgba(255,0,102,0.5)')} />
        <div style={cornerDecor('bottomLeft', 'rgba(255,0,102,0.5)')} />
        <div style={cornerDecor('bottomRight', 'rgba(255,0,102,0.5)')} />

        {/* Terminal title bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          background: 'rgba(255,0,102,0.04)',
          borderBottom: '1px solid rgba(255,0,102,0.15)',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff3b30' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffcc00' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#33ff66' }} />
          <span style={{
            marginLeft: 12,
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 10,
            letterSpacing: 3,
            color: 'rgba(255,0,102,0.5)',
          }}>
            ハック端末 -- コマンド注入
          </span>
        </div>

        {/* Terminal body */}
        <div style={{
          padding: '20px 24px',
          position: 'relative',
          zIndex: 3,
          minHeight: 300,
        }}>
          {/* Feedback */}
          <AnimatePresence>
            {lastFeedback && (
              <motion.div
                key={lastFeedback.feedback}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                style={{
                  padding: '8px 16px',
                  marginBottom: 16,
                  fontSize: 12,
                  letterSpacing: 1,
                  background: lastFeedback.correct
                    ? 'rgba(51,255,102,0.08)'
                    : 'rgba(255,51,51,0.08)',
                  border: `1px solid ${lastFeedback.correct ? 'rgba(51,255,102,0.25)' : 'rgba(255,51,51,0.25)'}`,
                  color: lastFeedback.correct ? '#33ff66' : '#ff3333',
                }}
              >
                {lastFeedback.correct ? '> ' : '! '}{lastFeedback.feedback}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success flash overlay */}
          <AnimatePresence>
            {flashSuccess && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(ellipse at center, rgba(51,255,102,0.1), transparent 70%)',
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
              />
            )}
          </AnimatePresence>

          {/* Command progress header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}>
            <div style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 18,
              letterSpacing: 3,
              color: '#ff0066',
              textShadow: '0 0 10px rgba(255,0,102,0.4)',
            }}>
              コマンド {currentIndex + 1}/{commandCount}
            </div>

            {/* Command step indicators */}
            <div style={{ display: 'flex', gap: 6 }}>
              {Array.from({ length: commandCount }, (_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    background: completedCommands.has(i)
                      ? '#33ff66'
                      : i === currentIndex
                        ? '#ff0066'
                        : 'rgba(255,255,255,0.1)',
                    boxShadow: completedCommands.has(i)
                      ? '0 0 8px rgba(51,255,102,0.5)'
                      : i === currentIndex
                        ? '0 0 8px rgba(255,0,102,0.5)'
                        : 'none',
                  }}
                  transition={{ duration: 0.3 }}
                  style={{
                    width: 12,
                    height: 12,
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Completed commands log */}
          {completedCommands.size > 0 && (
            <div style={{ marginBottom: 16 }}>
              {Array.from(completedCommands).sort().map(idx => (
                <div key={idx} style={{
                  fontSize: 11,
                  color: 'rgba(51,255,102,0.4)',
                  marginBottom: 2,
                  paddingLeft: 8,
                }}>
                  <span style={{ color: 'rgba(51,255,102,0.3)' }}>{'>'}</span> コマンド {idx + 1}: <span style={{ color: 'rgba(51,255,102,0.6)' }}>実行完了</span>
                </div>
              ))}
            </div>
          )}

          {/* Terminal prompt input */}
          <div style={{
            padding: '16px',
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,0,102,0.2)',
            clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
          }}>
            {/* Prompt label */}
            <div style={{
              fontSize: 11,
              color: 'rgba(255,0,102,0.3)',
              marginBottom: 8,
            }}>
              口述されたコマンドを正確に入力せよ:
            </div>

            {/* Input line */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 14,
                color: 'rgba(255,0,102,0.6)',
                flexShrink: 0,
                userSelect: 'none',
              }}>
                root@ORBITAL-7:~$
              </span>

              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: '#ff0066',
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 16,
                  outline: 'none',
                  textShadow: '0 0 6px rgba(255,0,102,0.3)',
                  padding: 0,
                  caretColor: '#ff0066',
                }}
              />

              {/* Blinking cursor indicator */}
              <motion.div
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                style={{
                  width: 8,
                  height: 18,
                  background: 'rgba(255,0,102,0.5)',
                  flexShrink: 0,
                }}
              />
            </div>
          </div>

          {/* Execute button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={!userInput.trim()}
              style={{
                background: userInput.trim()
                  ? 'linear-gradient(135deg, rgba(255,0,102,0.15), rgba(255,0,102,0.3))'
                  : 'rgba(60,60,60,0.2)',
                border: `1px solid ${userInput.trim() ? 'rgba(255,0,102,0.5)' : '#333'}`,
                color: userInput.trim() ? '#ff0066' : '#555',
                padding: '8px 24px',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 11,
                letterSpacing: 3,
                cursor: userInput.trim() ? 'pointer' : 'default',
                clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
              }}
            >
              実行
            </motion.button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid rgba(255,0,102,0.1)',
          background: 'rgba(0,0,0,0.3)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: 'rgba(255,0,102,0.4)',
            letterSpacing: 1,
            marginBottom: 6,
          }}>
            <span>注入進捗</span>
            <span>{completedCommands.size} / {commandCount}</span>
          </div>
          <div style={{
            height: 4,
            background: 'rgba(255,0,102,0.1)',
            overflow: 'hidden',
          }}>
            <motion.div
              animate={{ width: `${(completedCommands.size / commandCount) * 100}%` }}
              transition={{ duration: 0.5 }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #ff0066, #33ff66)',
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

export default function HackTerminalPuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
