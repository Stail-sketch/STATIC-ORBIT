// ===== STATIC ORBIT — Escape Pod Boss Puzzle (Final) =====

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../hooks/useSocket';
import { useGameStore } from '../../stores/gameStore';

interface PuzzleProps {
  roleData: Record<string, unknown>;
  role: 'observer' | 'operator' | 'navigator' | 'hacker';
}

/* -- Boss Styles (Final - Most Intense) --------------------------- */

const containerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 880,
  margin: '0 auto',
  fontFamily: "'Share Tech Mono', 'Courier New', monospace",
  color: '#e0e0e0',
};

const finalBossPanelStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(20,2,2,0.98) 0%, rgba(30,5,10,0.96) 100%)',
  border: '2px solid rgba(255,50,50,0.35)',
  borderRadius: 2,
  padding: 24,
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 0 40px rgba(255,30,30,0.1), inset 0 0 60px rgba(255,0,0,0.03)',
};

const bossHeaderStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', sans-serif",
  fontSize: 14,
  letterSpacing: 3,
  textTransform: 'uppercase' as const,
  color: '#ff3333',
  textAlign: 'center' as const,
  marginBottom: 24,
  paddingBottom: 12,
  borderBottom: '1px solid rgba(255,50,50,0.3)',
};

const scanlineOverlay: React.CSSProperties = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,30,30,0.012) 2px, rgba(255,30,30,0.012) 4px)',
  pointerEvents: 'none',
  zIndex: 1,
};

const gridOverlay: React.CSSProperties = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundImage:
    'linear-gradient(rgba(255,30,30,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,30,30,0.02) 1px, transparent 1px)',
  backgroundSize: '20px 20px',
  pointerEvents: 'none',
  zIndex: 0,
};

const cornerDecor = (position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 12, height: 12,
    borderColor: 'rgba(255,50,50,0.6)',
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

const SUBSYSTEM_LABELS: Record<string, string> = {
  power: '\u96FB\u6E90',
  seal: '\u6C17\u5BC6',
  nav: '\u30CA\u30D3',
  thrust: '\u63A8\u9032',
};

/* -- Observer View ------------------------------------------------ */

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const solutions = roleData.solutions as Record<string, unknown>;
  const subsystemOrder = roleData.subsystemOrder as string[];

  return (
    <div style={containerStyle}>
      <div style={finalBossPanelStyle}>
        <div style={scanlineOverlay} />
        <div style={gridOverlay} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={bossHeaderStyle}>
          <div style={{ marginBottom: 4 }}>/// 脱出ポッド -- 全サブシステム解答 ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,50,50,0.5)', letterSpacing: 2 }}>
            順番にオペレーターへ伝達せよ
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 3, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {subsystemOrder.map((sys, i) => {
            const val = solutions[sys];
            let displayVal = '';
            if (sys === 'seal' && Array.isArray(val)) {
              displayVal = (val as boolean[]).map((v: boolean) => v ? 'ON' : 'OFF').join(' / ');
            } else {
              displayVal = String(val);
            }

            return (
              <motion.div
                key={sys}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                style={{
                  padding: '16px 18px',
                  background: 'rgba(255,50,50,0.04)',
                  border: '1px solid rgba(255,50,50,0.2)',
                  borderLeft: '3px solid rgba(255,50,50,0.5)',
                }}
              >
                <div style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 10, letterSpacing: 2,
                  color: 'rgba(255,50,50,0.6)',
                  marginBottom: 8,
                }}>
                  [{i + 1}] {SUBSYSTEM_LABELS[sys]}
                </div>
                <div style={{
                  fontSize: 22, color: '#ff6644',
                  textShadow: '0 0 10px rgba(255,100,50,0.4)',
                  letterSpacing: 3,
                  fontFamily: "'Share Tech Mono', monospace",
                }}>
                  {displayVal}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div style={{
          marginTop: 20, padding: '8px 12px',
          background: 'rgba(255,50,50,0.04)',
          border: '1px solid rgba(255,50,50,0.1)',
          fontSize: 10, color: 'rgba(255,50,50,0.4)',
          textAlign: 'center', letterSpacing: 1,
          position: 'relative', zIndex: 3,
        }}>
          1 \u2192 2 \u2192 3 \u2192 4 の順番で起動が必要です
        </div>
      </div>
    </div>
  );
}

/* -- Operator View ------------------------------------------------ */

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const subsystemOrder = roleData.subsystemOrder as string[];
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [completed, setCompleted] = useState<Set<string>>(() => new Set());
  const [activeTab, setActiveTab] = useState(0);

  // Form states
  const [powerCode, setPowerCode] = useState('');
  const [sealSwitches, setSealSwitches] = useState([false, false, false, false]);
  const [navX, setNavX] = useState('');
  const [navY, setNavY] = useState('');
  const [thrust, setThrust] = useState(50);

  const prevFeedback = useRef(lastFeedback);
  useEffect(() => {
    if (lastFeedback && lastFeedback !== prevFeedback.current && lastFeedback.correct) {
      const fb = lastFeedback.feedback || '';
      for (const sys of subsystemOrder) {
        if (fb.includes(SUBSYSTEM_LABELS[sys]) && fb.includes('成功')) {
          setCompleted(prev => {
            const next = new Set(prev);
            next.add(sys);
            return next;
          });
          // Auto-advance to next tab
          const idx = subsystemOrder.indexOf(sys);
          if (idx < subsystemOrder.length - 1) {
            setActiveTab(idx + 1);
          }
        }
      }
    }
    prevFeedback.current = lastFeedback;
  }, [lastFeedback, subsystemOrder]);

  const handleSubmit = useCallback((system: string) => {
    const socket = getSocket();
    let answer: unknown;

    switch (system) {
      case 'power': answer = powerCode; break;
      case 'seal': answer = sealSwitches; break;
      case 'nav': answer = { x: parseInt(navX, 10) || 0, y: parseInt(navY, 10) || 0 }; break;
      case 'thrust': answer = thrust; break;
    }

    socket.emit('game:action', {
      puzzleId: 'escape-pod',
      action: 'subsystem',
      data: { system, answer },
    });
  }, [powerCode, sealSwitches, navX, navY, thrust]);

  const allComplete = completed.size === subsystemOrder.length;

  return (
    <div style={containerStyle}>
      <div style={finalBossPanelStyle}>
        <div style={scanlineOverlay} />
        <div style={gridOverlay} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={{
          ...bossHeaderStyle,
          color: '#ff2222',
          borderBottomColor: 'rgba(255,30,30,0.3)',
        }}>
          <div style={{ marginBottom: 4 }}>/// 脱出ポッド起動シーケンス ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,30,30,0.5)', letterSpacing: 2 }}>
            4つのサブシステムを順番に起動せよ
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
                fontSize: 12, letterSpacing: 1,
                background: lastFeedback.correct ? 'rgba(51,255,102,0.1)' : 'rgba(255,51,51,0.15)',
                border: `1px solid ${lastFeedback.correct ? 'rgba(51,255,102,0.3)' : 'rgba(255,51,51,0.4)'}`,
                color: lastFeedback.correct ? '#33ff66' : '#ff3333',
                position: 'relative', zIndex: 3,
              }}
            >
              {lastFeedback.feedback}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ position: 'relative', zIndex: 3 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
            {subsystemOrder.map((sys, i) => {
              const isComplete = completed.has(sys);
              const isActive = i === activeTab;
              return (
                <motion.button
                  key={sys}
                  onClick={() => setActiveTab(i)}
                  whileHover={{ scale: 1.02 }}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    background: isComplete
                      ? 'rgba(51,255,102,0.1)'
                      : isActive
                        ? 'rgba(255,50,50,0.15)'
                        : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isComplete ? 'rgba(51,255,102,0.4)' : isActive ? 'rgba(255,50,50,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: isComplete ? '#33ff66' : isActive ? '#ff4444' : 'rgba(255,255,255,0.3)',
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: 11, letterSpacing: 2,
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  {isComplete && <span style={{ marginRight: 6 }}>&#10003;</span>}
                  {SUBSYSTEM_LABELS[sys]}
                </motion.button>
              );
            })}
          </div>

          {/* Subsystem forms */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              style={{
                padding: '20px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,50,50,0.15)',
                minHeight: 140,
              }}
            >
              {/* Power subsystem */}
              {activeTab === 0 && (
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,50,50,0.6)', marginBottom: 14, letterSpacing: 1 }}>
                    [1] 電源 -- 3桁の起動コードを入力
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={powerCode}
                      onChange={(e) => setPowerCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                      placeholder="000"
                      maxLength={3}
                      disabled={completed.has('power')}
                      style={{
                        width: 140, padding: '12px 16px',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,50,50,0.3)',
                        color: '#ff6644', fontSize: 28, letterSpacing: 12,
                        fontFamily: "'Share Tech Mono', monospace",
                        textAlign: 'center', outline: 'none',
                      }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSubmit('power')}
                      disabled={completed.has('power')}
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,50,50,0.2), rgba(255,50,50,0.4))',
                        border: '1px solid rgba(255,50,50,0.5)',
                        color: '#ff4444', padding: '12px 24px',
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: 12, letterSpacing: 2, cursor: 'pointer',
                      }}
                    >
                      起動
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Seal subsystem */}
              {activeTab === 1 && (
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,50,50,0.6)', marginBottom: 14, letterSpacing: 1 }}>
                    [2] 気密 -- 4つのスイッチを正しいパターンに設定
                  </div>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                    {sealSwitches.map((val, i) => (
                      <motion.button
                        key={i}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (completed.has('seal')) return;
                          setSealSwitches(prev => {
                            const next = [...prev];
                            next[i] = !next[i];
                            return next;
                          });
                        }}
                        style={{
                          width: 64, height: 64,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexDirection: 'column',
                          background: val ? 'rgba(51,255,102,0.15)' : 'rgba(255,50,50,0.1)',
                          border: `2px solid ${val ? 'rgba(51,255,102,0.5)' : 'rgba(255,50,50,0.3)'}`,
                          color: val ? '#33ff66' : '#ff4444',
                          fontFamily: "'Orbitron', sans-serif",
                          fontSize: 10, letterSpacing: 1, cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontSize: 18, marginBottom: 2 }}>{val ? 'ON' : 'OFF'}</div>
                        <div style={{ fontSize: 8, opacity: 0.5 }}>SW{i + 1}</div>
                      </motion.button>
                    ))}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSubmit('seal')}
                    disabled={completed.has('seal')}
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,50,50,0.2), rgba(255,50,50,0.4))',
                      border: '1px solid rgba(255,50,50,0.5)',
                      color: '#ff4444', padding: '10px 24px',
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: 12, letterSpacing: 2, cursor: 'pointer',
                    }}
                  >
                    起動
                  </motion.button>
                </div>
              )}

              {/* Nav subsystem */}
              {activeTab === 2 && (
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,50,50,0.6)', marginBottom: 14, letterSpacing: 1 }}>
                    [3] ナビ -- 目標座標を入力
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'rgba(255,100,50,0.6)', fontSize: 14 }}>X:</span>
                      <input
                        type="number"
                        value={navX}
                        onChange={(e) => setNavX(e.target.value)}
                        disabled={completed.has('nav')}
                        style={{
                          width: 100, padding: '10px 12px',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,50,50,0.3)',
                          color: '#ff6644', fontSize: 18,
                          fontFamily: "'Share Tech Mono', monospace",
                          textAlign: 'center', outline: 'none',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'rgba(255,100,50,0.6)', fontSize: 14 }}>Y:</span>
                      <input
                        type="number"
                        value={navY}
                        onChange={(e) => setNavY(e.target.value)}
                        disabled={completed.has('nav')}
                        style={{
                          width: 100, padding: '10px 12px',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,50,50,0.3)',
                          color: '#ff6644', fontSize: 18,
                          fontFamily: "'Share Tech Mono', monospace",
                          textAlign: 'center', outline: 'none',
                        }}
                      />
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSubmit('nav')}
                      disabled={completed.has('nav')}
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,50,50,0.2), rgba(255,50,50,0.4))',
                        border: '1px solid rgba(255,50,50,0.5)',
                        color: '#ff4444', padding: '10px 24px',
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: 12, letterSpacing: 2, cursor: 'pointer',
                      }}
                    >
                      起動
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Thrust subsystem */}
              {activeTab === 3 && (
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,50,50,0.6)', marginBottom: 14, letterSpacing: 1 }}>
                    [4] 推進 -- 推力パーセンテージを設定
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={thrust}
                      onChange={(e) => setThrust(Number(e.target.value))}
                      disabled={completed.has('thrust')}
                      style={{
                        flex: 1, height: 8,
                        appearance: 'none', WebkitAppearance: 'none',
                        background: 'linear-gradient(90deg, rgba(255,50,50,0.2), rgba(255,50,50,0.5))',
                        outline: 'none', cursor: 'pointer',
                        accentColor: '#ff4444',
                      }}
                    />
                    <div style={{
                      fontSize: 28, color: '#ff6644',
                      textShadow: '0 0 10px rgba(255,100,50,0.4)',
                      fontFamily: "'Share Tech Mono', monospace",
                      letterSpacing: 3, minWidth: 80, textAlign: 'right',
                    }}>
                      {thrust}%
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSubmit('thrust')}
                    disabled={completed.has('thrust')}
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,50,50,0.2), rgba(255,50,50,0.4))',
                      border: '1px solid rgba(255,50,50,0.5)',
                      color: '#ff4444', padding: '10px 24px',
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: 12, letterSpacing: 2, cursor: 'pointer',
                    }}
                  >
                    起動
                  </motion.button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Progress indicators */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
            {subsystemOrder.map((sys, i) => (
              <div key={sys} style={{
                width: 12, height: 12,
                borderRadius: '50%',
                background: completed.has(sys)
                  ? '#33ff66'
                  : 'rgba(255,50,50,0.2)',
                border: `1px solid ${completed.has(sys) ? 'rgba(51,255,102,0.6)' : 'rgba(255,50,50,0.3)'}`,
                boxShadow: completed.has(sys) ? '0 0 8px rgba(51,255,102,0.4)' : 'none',
              }} />
            ))}
          </div>

          {/* LAUNCH indicator */}
          {allComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
              style={{
                marginTop: 24,
                padding: '20px',
                background: 'linear-gradient(135deg, rgba(51,255,102,0.1), rgba(0,240,255,0.1))',
                border: '2px solid rgba(51,255,102,0.5)',
                textAlign: 'center',
              }}
            >
              <div style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 28,
                letterSpacing: 12,
                color: '#33ff66',
                textShadow: '0 0 20px rgba(51,255,102,0.6), 0 0 40px rgba(51,255,102,0.3)',
              }}>
                LAUNCH READY
              </div>
              <div style={{
                fontSize: 11, color: 'rgba(51,255,102,0.6)',
                letterSpacing: 2, marginTop: 8,
              }}>
                全サブシステム起動完了 -- 脱出シーケンス実行中
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -- Main Component ----------------------------------------------- */

export default function EscapePodPuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
