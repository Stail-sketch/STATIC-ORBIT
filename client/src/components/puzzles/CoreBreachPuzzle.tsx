// ===== STATIC ORBIT — Core Breach Boss Puzzle =====

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../hooks/useSocket';
import { useGameStore } from '../../stores/gameStore';

interface PuzzleProps {
  roleData: Record<string, unknown>;
  role: 'observer' | 'operator' | 'navigator' | 'hacker';
}

interface Problem {
  index: number;
  type: 'math' | 'color' | 'symbol';
  question: string;
  answer?: string;
}

/* -- Boss Styles -------------------------------------------------- */

const containerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 880,
  margin: '0 auto',
  fontFamily: "'Share Tech Mono', 'Courier New', monospace",
  color: '#e0e0e0',
};

const bossPanelStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(15,5,5,0.97) 0%, rgba(25,8,8,0.95) 100%)',
  border: '1px solid rgba(255,100,50,0.3)',
  borderRadius: 2,
  padding: 24,
  position: 'relative',
  overflow: 'hidden',
};

const bossHeaderStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', sans-serif",
  fontSize: 14,
  letterSpacing: 3,
  textTransform: 'uppercase' as const,
  color: '#ff6633',
  textAlign: 'center' as const,
  marginBottom: 24,
  paddingBottom: 12,
  borderBottom: '1px solid rgba(255,100,50,0.25)',
};

const scanlineOverlay: React.CSSProperties = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,100,50,0.01) 2px, rgba(255,100,50,0.01) 4px)',
  pointerEvents: 'none',
  zIndex: 1,
};

const gridOverlay: React.CSSProperties = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundImage:
    'linear-gradient(rgba(255,100,50,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,100,50,0.02) 1px, transparent 1px)',
  backgroundSize: '20px 20px',
  pointerEvents: 'none',
  zIndex: 0,
};

const cornerDecor = (position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 12, height: 12,
    borderColor: 'rgba(255,100,50,0.5)',
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
  const problems = roleData.problems as Problem[];
  const threshold = roleData.threshold as number;
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  // Track current problem from feedback
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const prevFeedback = useRef(lastFeedback);
  useEffect(() => {
    if (lastFeedback && lastFeedback !== prevFeedback.current) {
      const match = lastFeedback.feedback?.match(/\((\d+)\/(\d+)\)/);
      if (match) setScore(parseInt(match[1], 10));
      if (lastFeedback.feedback?.includes('正解') || lastFeedback.feedback?.includes('不正解')) {
        setCurrentIdx(p => Math.min(p + 1, problems.length - 1));
      }
    }
    prevFeedback.current = lastFeedback;
  }, [lastFeedback, problems.length]);

  return (
    <div style={containerStyle}>
      <div style={bossPanelStyle}>
        <div style={scanlineOverlay} />
        <div style={gridOverlay} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={bossHeaderStyle}>
          <div style={{ marginBottom: 4 }}>/// コアブリーチ -- 全問題リスト ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,100,50,0.5)', letterSpacing: 2 }}>
            解答をオペレーターに伝えてください ({score}/{threshold})
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 3, overflowY: 'auto', maxHeight: 400 }}>
          {problems.map((p, i) => {
            const isCurrent = i === currentIdx;
            const isPast = i < currentIdx;
            return (
              <motion.div
                key={p.index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: isPast ? 0.35 : 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  marginBottom: 4,
                  background: isCurrent ? 'rgba(255,100,50,0.12)' : 'transparent',
                  borderLeft: isCurrent ? '3px solid #ff6633' : '3px solid transparent',
                }}
              >
                <div style={{
                  fontSize: 10, color: 'rgba(255,100,50,0.4)',
                  minWidth: 30, fontFamily: "'Share Tech Mono', monospace",
                }}>
                  #{p.index + 1}
                </div>
                <div style={{
                  fontSize: 10, color: 'rgba(255,100,50,0.3)',
                  minWidth: 40, letterSpacing: 1,
                  fontFamily: "'Orbitron', sans-serif",
                }}>
                  {p.type === 'math' ? '計算' : p.type === 'color' ? '色' : '記号'}
                </div>
                <div style={{
                  flex: 1, fontSize: 13,
                  color: isCurrent ? '#ff6633' : 'rgba(255,255,255,0.5)',
                }}>
                  {p.question}
                </div>
                <div style={{
                  fontSize: 16, fontWeight: 'bold',
                  color: '#ff6644',
                  textShadow: isCurrent ? '0 0 8px rgba(255,100,50,0.4)' : 'none',
                  letterSpacing: 2,
                  minWidth: 80, textAlign: 'right',
                }}>
                  {p.answer}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* -- Operator View ------------------------------------------------ */

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const problems = roleData.problems as Problem[];
  const threshold = roleData.threshold as number;
  const totalProblems = roleData.totalProblems as number;
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<Set<number>>(() => new Set());

  const inputRef = useRef<HTMLInputElement>(null);

  const prevFeedback = useRef(lastFeedback);
  useEffect(() => {
    if (lastFeedback && lastFeedback !== prevFeedback.current) {
      const match = lastFeedback.feedback?.match(/\((\d+)\/(\d+)\)/);
      if (match) setScore(parseInt(match[1], 10));
      // Auto-advance on answer
      if (lastFeedback.feedback?.includes('正解') || lastFeedback.feedback?.includes('不正解')) {
        setAnswer('');
        setCurrentIdx(p => {
          let next = p + 1;
          while (next < problems.length && answered.has(next)) next++;
          return Math.min(next, problems.length - 1);
        });
        // Re-focus input
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
    prevFeedback.current = lastFeedback;
  }, [lastFeedback, problems.length, answered]);

  const handleSubmit = useCallback(() => {
    if (!answer.trim()) return;
    const problem = problems[currentIdx];
    setAnswered(prev => new Set(prev).add(currentIdx));
    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'core-breach',
      action: 'breach',
      data: { problemIndex: problem.index, answer: answer.trim() },
    });
  }, [answer, currentIdx, problems]);

  const handleSkip = useCallback(() => {
    setAnswer('');
    setCurrentIdx(p => {
      let next = p + 1;
      while (next < problems.length && answered.has(next)) next++;
      return Math.min(next, problems.length - 1);
    });
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [problems.length, answered]);

  const currentProblem = problems[currentIdx];

  return (
    <div style={containerStyle}>
      <div style={{
        ...bossPanelStyle,
        border: '1px solid rgba(255,80,30,0.4)',
      }}>
        <div style={scanlineOverlay} />
        <div style={gridOverlay} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={{
          ...bossHeaderStyle,
          color: '#ff4422',
          borderBottomColor: 'rgba(255,68,34,0.25)',
        }}>
          <div style={{ marginBottom: 4 }}>/// コアブリーチ突破 ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,68,34,0.5)', letterSpacing: 2 }}>
            ファイアウォール問題を素早く解答せよ
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
              transition={{ type: 'tween', duration: 0.15 }}
              style={{
                padding: '6px 16px',
                marginBottom: 12,
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
          {/* Score counter */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginBottom: 16,
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, color: 'rgba(255,100,50,0.5)', letterSpacing: 1 }}>
              問題 {currentIdx + 1} / {totalProblems}
            </span>
            <div style={{
              fontSize: 22, fontWeight: 'bold',
              color: score >= threshold ? '#33ff66' : '#ff6633',
              textShadow: `0 0 10px ${score >= threshold ? 'rgba(51,255,102,0.4)' : 'rgba(255,100,50,0.4)'}`,
              fontFamily: "'Share Tech Mono', monospace",
              letterSpacing: 3,
            }}>
              {score} / {threshold}
            </div>
          </div>

          {/* Current problem - large display */}
          {currentProblem && (
            <motion.div
              key={currentProblem.index}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                padding: '28px 24px',
                marginBottom: 20,
                background: 'rgba(255,100,50,0.06)',
                borderLeft: '4px solid rgba(255,100,50,0.6)',
                textAlign: 'center',
              }}
            >
              <div style={{
                fontSize: 10, color: 'rgba(255,100,50,0.4)',
                letterSpacing: 2, marginBottom: 12,
                fontFamily: "'Orbitron', sans-serif",
              }}>
                {currentProblem.type === 'math' ? '計算問題' : currentProblem.type === 'color' ? '色コード変換' : '記号識別'}
              </div>
              <div style={{
                fontSize: 36, color: '#ff6633',
                textShadow: '0 0 16px rgba(255,100,50,0.4), 0 0 32px rgba(255,100,50,0.15)',
                letterSpacing: 6,
                fontFamily: "'Share Tech Mono', monospace",
              }}>
                {currentProblem.question}
              </div>
            </motion.div>
          )}

          {/* Input + buttons */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
            <input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="解答を入力..."
              autoFocus
              style={{
                flex: 1, padding: '14px 18px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,100,50,0.3)',
                color: '#e0e0e0', fontSize: 20, letterSpacing: 3,
                fontFamily: "'Share Tech Mono', monospace",
                outline: 'none',
              }}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              style={{
                background: 'linear-gradient(135deg, rgba(255,80,30,0.2), rgba(255,80,30,0.5))',
                border: '2px solid rgba(255,80,30,0.6)',
                color: '#ff6633', padding: '14px 28px',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 13, letterSpacing: 3, cursor: 'pointer',
                textShadow: '0 0 6px rgba(255,100,50,0.3)',
              }}
            >
              突破
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSkip}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.3)', padding: '14px 18px',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 10, letterSpacing: 2, cursor: 'pointer',
              }}
            >
              SKIP
            </motion.button>
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: 20 }}>
            <div style={{ height: 4, background: 'rgba(255,100,50,0.1)', overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${(score / threshold) * 100}%` }}
                transition={{ duration: 0.3 }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #ff6633, #33ff66)',
                  boxShadow: '0 0 8px rgba(255,100,50,0.4)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -- Main Component ----------------------------------------------- */

export default function CoreBreachPuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
