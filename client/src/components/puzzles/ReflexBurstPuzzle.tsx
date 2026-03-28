// ===== STATIC ORBIT — Reflex Burst Puzzle (Redesigned) =====

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../hooks/useSocket';
import { useGameStore } from '../../stores/gameStore';

interface PuzzleProps {
  roleData: Record<string, unknown>;
  role: 'observer' | 'operator' | 'navigator' | 'hacker';
}

/* -- Shared Styles ------------------------------------------------- */

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

/* -- Key color mapping ---------------------------------------------- */

const KEY_COLORS: Record<string, string> = {
  W: '#00f0ff',
  A: '#ff0066',
  S: '#33ff66',
  D: '#ffaa00',
  J: '#aa66ff',
  K: '#ff6633',
  L: '#66ffcc',
};

const AVAILABLE_KEYS = ['W', 'A', 'S', 'D', 'J', 'K', 'L'];

/* -- Observer View -------------------------------------------------- */

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const sequence = roleData.sequence as Array<{
    key: string;
    isFake: boolean;
    beatIndex: number;
  }>;
  const tempo = roleData.tempo as number;
  const totalBeats = roleData.totalBeats as number;
  const bpm = Math.round(60000 / tempo);

  const lastFeedback = useGameStore((s) => s.lastFeedback);
  const [playCount, setPlayCount] = useState(0);
  const [sequenceActive, setSequenceActive] = useState(false);

  // Track sequence timing to re-enable button after sequence completes
  useEffect(() => {
    if (!sequenceActive) return;

    // Countdown (3 beats) + all beats in sequence
    const totalDuration = (3 + totalBeats) * tempo + 500;
    const timer = setTimeout(() => {
      setSequenceActive(false);
    }, totalDuration);

    return () => clearTimeout(timer);
  }, [sequenceActive, totalBeats, tempo]);

  const handlePlay = useCallback(() => {
    if (sequenceActive) return;
    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'reflex-burst',
      action: 'start-sequence',
      data: {},
    });
    setPlayCount((c) => c + 1);
    setSequenceActive(true);
  }, [sequenceActive]);

  // Detect if puzzle was solved (feedback contains success indicator)
  const solved = lastFeedback?.feedback === '解除成功！' || lastFeedback?.feedback === 'バイパス完了';

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
          <div style={{ marginBottom: 4 }}>/// バイパスシーケンス -- キーを読み上げよ ///</div>
          <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.5)', letterSpacing: 2 }}>
            テンポ: {bpm} BPM -- {totalBeats}ビート
          </div>
        </div>

        {/* Sequence timeline */}
        <div style={{
          position: 'relative',
          zIndex: 3,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'center',
        }}>
          {sequence.map((cmd, i) => {
            const color = KEY_COLORS[cmd.key] || '#ffffff';

            return (
              <motion.div
                key={cmd.beatIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '10px 14px',
                  background: cmd.isFake
                    ? 'rgba(255,34,68,0.08)'
                    : 'rgba(0,240,255,0.06)',
                  border: `1px solid ${cmd.isFake ? 'rgba(255,34,68,0.3)' : 'rgba(0,240,255,0.2)'}`,
                  clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                  minWidth: 50,
                  position: 'relative',
                }}
              >
                {/* Beat number */}
                <span style={{
                  fontSize: 8,
                  color: 'rgba(0,240,255,0.4)',
                  letterSpacing: 1,
                  fontFamily: "'Orbitron', sans-serif",
                }}>
                  #{cmd.beatIndex + 1}
                </span>

                {/* Key badge */}
                <span style={{
                  fontSize: 22,
                  fontWeight: 'bold',
                  color: cmd.isFake ? 'rgba(255,34,68,0.4)' : color,
                  textShadow: cmd.isFake ? 'none' : `0 0 8px ${color}80`,
                  textDecoration: cmd.isFake ? 'line-through' : 'none',
                  fontFamily: "'Orbitron', sans-serif",
                }}>
                  {cmd.key}
                </span>

                {/* Fake label */}
                {cmd.isFake && (
                  <span style={{
                    fontSize: 7,
                    letterSpacing: 2,
                    color: '#ff2244',
                    fontFamily: "'Orbitron', sans-serif",
                    background: 'rgba(255,34,68,0.15)',
                    padding: '1px 6px',
                  }}>
                    フェイク
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Footer with real count */}
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
          本物{sequence.filter(s => !s.isFake).length}個 -- フェイク{sequence.filter(s => s.isFake).length}個 -- 順番を正確に伝えてください
        </div>

        {/* Play button and play count */}
        <div style={{
          marginTop: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          position: 'relative',
          zIndex: 3,
        }}>
          <motion.button
            whileHover={!sequenceActive && !solved ? { scale: 1.05 } : {}}
            whileTap={!sequenceActive && !solved ? { scale: 0.97 } : {}}
            onClick={handlePlay}
            disabled={sequenceActive || solved}
            style={{
              padding: '16px 48px',
              fontSize: 20,
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 'bold',
              letterSpacing: 4,
              color: sequenceActive || solved ? 'rgba(0,240,255,0.3)' : '#00f0ff',
              background: sequenceActive || solved
                ? 'rgba(0,240,255,0.03)'
                : 'rgba(0,240,255,0.1)',
              border: `2px solid ${sequenceActive || solved ? 'rgba(0,240,255,0.15)' : 'rgba(0,240,255,0.5)'}`,
              borderRadius: 2,
              cursor: sequenceActive || solved ? 'not-allowed' : 'pointer',
              textShadow: sequenceActive || solved ? 'none' : '0 0 12px rgba(0,240,255,0.6)',
              boxShadow: sequenceActive || solved ? 'none' : '0 0 20px rgba(0,240,255,0.15)',
              transition: 'all 0.2s ease',
              clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
            }}
          >
            {solved ? 'クリア済み' : sequenceActive ? '再生中...' : '再生'}
          </motion.button>

          {playCount > 0 && (
            <div style={{
              fontSize: 11,
              color: 'rgba(0,240,255,0.4)',
              letterSpacing: 2,
              fontFamily: "'Orbitron', sans-serif",
            }}>
              再生回数: {playCount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -- Operator View -------------------------------------------------- */

type SequencePhase = 'waiting' | 'countdown' | 'playing' | 'finished';
type BeatResult = 'correct' | 'miss' | 'pending';

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const tempo = roleData.tempo as number;
  const totalBeats = roleData.totalBeats as number;
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [phase, setPhase] = useState<SequencePhase>('waiting');
  const [countdownValue, setCountdownValue] = useState(3);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [beatResults, setBeatResults] = useState<BeatResult[]>([]);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [beatProgress, setBeatProgress] = useState(0);

  const phaseRef = useRef<SequencePhase>('waiting');
  const currentBeatRef = useRef(-1);
  const beatStartTimeRef = useRef(0);
  const pressedThisBeatRef = useRef(false);
  const beatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackProcessedRef = useRef<string | null>(null);

  // Keep refs in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { currentBeatRef.current = currentBeat; }, [currentBeat]);

  // Detect start-sequence from lastFeedback
  useEffect(() => {
    if (!lastFeedback) return;
    if (lastFeedback.feedback === 'シーケンス開始' && phaseRef.current !== 'countdown' && phaseRef.current !== 'playing') {
      startCountdown();
    }
  }, [lastFeedback]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track beat results from action feedback
  useEffect(() => {
    if (!lastFeedback || lastFeedback.feedback === 'シーケンス開始') return;
    if (phaseRef.current !== 'playing') return;

    // Avoid processing the same feedback twice
    const feedbackKey = `${lastFeedback.feedback}-${currentBeatRef.current}`;
    if (feedbackProcessedRef.current === feedbackKey) return;
    feedbackProcessedRef.current = feedbackKey;

    const beat = currentBeatRef.current;
    if (beat < 0 || beat >= totalBeats) return;

    if (lastFeedback.correct) {
      setBeatResults((prev) => {
        const next = [...prev];
        next[beat] = 'correct';
        return next;
      });
      setCorrectCount((c) => c + 1);
      setFlashColor('#33ff66');
    } else {
      setBeatResults((prev) => {
        const next = [...prev];
        next[beat] = 'miss';
        return next;
      });
      setFlashColor('#ff3333');
    }

    setTimeout(() => setFlashColor(null), 250);
  }, [lastFeedback, totalBeats]); // eslint-disable-line react-hooks/exhaustive-deps

  const cleanup = useCallback(() => {
    if (beatTimerRef.current) { clearInterval(beatTimerRef.current); beatTimerRef.current = null; }
    if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }
  }, []);

  const startCountdown = useCallback(() => {
    cleanup();
    setPhase('countdown');
    setCountdownValue(3);
    setCurrentBeat(-1);
    currentBeatRef.current = -1;
    setBeatResults(Array(totalBeats).fill('pending'));
    setCorrectCount(0);
    setFlashColor(null);
    feedbackProcessedRef.current = null;

    let count = 3;
    setCountdownValue(count);

    const cdTimer = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(cdTimer);
        startSequence();
      } else {
        setCountdownValue(count);
      }
    }, tempo);

    return () => clearInterval(cdTimer);
  }, [tempo, totalBeats, cleanup]); // eslint-disable-line react-hooks/exhaustive-deps

  const startSequence = useCallback(() => {
    setPhase('playing');
    phaseRef.current = 'playing';
    pressedThisBeatRef.current = false;

    let beat = 0;
    setCurrentBeat(0);
    currentBeatRef.current = 0;
    beatStartTimeRef.current = Date.now();
    setBeatProgress(0);

    // Progress animation timer (update ~30fps)
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - beatStartTimeRef.current;
      const progress = Math.min(elapsed / tempo, 1);
      setBeatProgress(progress);
    }, 33);

    // Beat advance timer
    beatTimerRef.current = setInterval(() => {
      // Mark missed beats (no press on a real beat)
      if (!pressedThisBeatRef.current) {
        setBeatResults((prev) => {
          const next = [...prev];
          if (next[beat] === 'pending') {
            // We don't know if this was a real or fake beat client-side,
            // so we leave pending beats as-is (server handles miss penalty if needed)
            // But we can mark it as "no input" visually
            next[beat] = 'miss';
          }
          return next;
        });
      }

      beat++;
      if (beat >= totalBeats) {
        cleanup();
        setPhase('finished');
        phaseRef.current = 'finished';
        setBeatProgress(1);
        return;
      }

      setCurrentBeat(beat);
      currentBeatRef.current = beat;
      beatStartTimeRef.current = Date.now();
      pressedThisBeatRef.current = false;
    }, tempo);
  }, [tempo, totalBeats, cleanup]);

  const handlePress = useCallback((key: string) => {
    if (phaseRef.current !== 'playing') return;
    if (pressedThisBeatRef.current) return;

    const beat = currentBeatRef.current;
    if (beat < 0 || beat >= totalBeats) return;

    pressedThisBeatRef.current = true;
    setCurrentKey(key);
    setTimeout(() => setCurrentKey(null), 200);

    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'reflex-burst',
      action: 'press',
      data: { key: key.toUpperCase(), beatIndex: beat },
    });
  }, [totalBeats]);

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      const key = e.key.toUpperCase();
      if (AVAILABLE_KEYS.includes(key)) {
        e.preventDefault();
        handlePress(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePress]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

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
          <div style={{ marginBottom: 4 }}>/// リフレックスバイパス ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,0,102,0.5)', letterSpacing: 2 }}>
            ビートに合わせてキーを押せ
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 3 }}>

          {/* --- WAITING PHASE --- */}
          {phase === 'waiting' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                textAlign: 'center',
                padding: '60px 20px',
              }}
            >
              <div style={{
                fontSize: 16,
                color: 'rgba(255,0,102,0.5)',
                letterSpacing: 3,
                fontFamily: "'Orbitron', sans-serif",
                marginBottom: 12,
              }}>
                オブザーバーの再生を待機中...
              </div>
              <motion.div
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#ff0066',
                  margin: '0 auto',
                  boxShadow: '0 0 12px rgba(255,0,102,0.5)',
                }}
              />
            </motion.div>
          )}

          {/* --- COUNTDOWN PHASE --- */}
          {phase === 'countdown' && (
            <motion.div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={countdownValue}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    fontSize: 120,
                    fontFamily: "'Orbitron', sans-serif",
                    fontWeight: 'bold',
                    color: '#00f0ff',
                    textShadow: '0 0 40px rgba(0,240,255,0.6), 0 0 80px rgba(0,240,255,0.3)',
                    lineHeight: 1,
                  }}
                >
                  {countdownValue}
                </motion.div>
              </AnimatePresence>
              <div style={{
                marginTop: 20,
                fontSize: 12,
                color: 'rgba(0,240,255,0.5)',
                letterSpacing: 3,
                fontFamily: "'Orbitron', sans-serif",
              }}>
                準備せよ
              </div>
            </motion.div>
          )}

          {/* --- PLAYING PHASE --- */}
          {phase === 'playing' && (
            <div>
              {/* Flash overlay */}
              <AnimatePresence>
                {flashColor && (
                  <motion.div
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: flashColor === '#33ff66'
                        ? 'radial-gradient(circle, rgba(51,255,102,0.2) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(255,51,51,0.2) 0%, transparent 70%)',
                      zIndex: 10,
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Beat timeline (small dots) */}
              <div style={{
                display: 'flex',
                gap: 3,
                justifyContent: 'center',
                marginBottom: 24,
                flexWrap: 'wrap',
              }}>
                {Array.from({ length: totalBeats }, (_, i) => {
                  const result = beatResults[i];
                  const isCurrent = i === currentBeat;
                  return (
                    <div
                      key={i}
                      style={{
                        width: 16,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 7,
                        fontFamily: "'Orbitron', sans-serif",
                        background: isCurrent
                          ? 'rgba(0,240,255,0.4)'
                          : result === 'correct'
                            ? 'rgba(51,255,102,0.3)'
                            : result === 'miss'
                              ? 'rgba(255,34,68,0.3)'
                              : 'rgba(255,255,255,0.05)',
                        border: isCurrent
                          ? '1px solid #00f0ff'
                          : result === 'correct'
                            ? '1px solid rgba(51,255,102,0.5)'
                            : result === 'miss'
                              ? '1px solid rgba(255,34,68,0.5)'
                              : '1px solid rgba(255,255,255,0.1)',
                        color: isCurrent ? '#00f0ff' : 'rgba(255,255,255,0.3)',
                        boxShadow: isCurrent ? '0 0 8px rgba(0,240,255,0.5)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {i + 1}
                    </div>
                  );
                })}
              </div>

              {/* Central key display area */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: 24,
              }}>
                {/* Pulsing rhythm circle + key */}
                <div style={{ position: 'relative', width: 180, height: 180 }}>
                  {/* Outer pulse ring */}
                  <motion.div
                    animate={{
                      scale: [1, 1.15, 1],
                      opacity: [0.3, 0.7, 0.3],
                    }}
                    transition={{ duration: tempo / 1000, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: 180,
                      height: 180,
                      borderRadius: '50%',
                      border: '2px solid rgba(0,240,255,0.3)',
                      boxShadow: '0 0 30px rgba(0,240,255,0.15)',
                    }}
                  />
                  {/* Inner circle with key */}
                  <div style={{
                    position: 'absolute',
                    top: 20,
                    left: 20,
                    width: 140,
                    height: 140,
                    borderRadius: '50%',
                    background: flashColor
                      ? flashColor === '#33ff66'
                        ? 'radial-gradient(circle, rgba(51,255,102,0.15) 0%, rgba(51,255,102,0.05) 100%)'
                        : 'radial-gradient(circle, rgba(255,51,51,0.15) 0%, rgba(255,51,51,0.05) 100%)'
                      : 'radial-gradient(circle, rgba(0,240,255,0.08) 0%, rgba(0,240,255,0.02) 100%)',
                    border: `2px solid ${flashColor
                      ? flashColor === '#33ff66' ? 'rgba(51,255,102,0.5)' : 'rgba(255,51,51,0.5)'
                      : 'rgba(0,240,255,0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}>
                    <span style={{
                      fontSize: 12,
                      color: 'rgba(0,240,255,0.4)',
                      fontFamily: "'Orbitron', sans-serif",
                      letterSpacing: 2,
                      position: 'absolute',
                      top: 20,
                    }}>
                      BEAT {currentBeat + 1}
                    </span>
                    <motion.span
                      key={`beat-${currentBeat}-${currentKey}`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      style={{
                        fontSize: 56,
                        fontFamily: "'Orbitron', sans-serif",
                        fontWeight: 'bold',
                        color: currentKey
                          ? (KEY_COLORS[currentKey] || '#ffffff')
                          : 'rgba(255,0,102,0.3)',
                        textShadow: currentKey
                          ? `0 0 20px ${KEY_COLORS[currentKey] || '#ffffff'}80`
                          : 'none',
                        marginTop: 10,
                      }}
                    >
                      {currentKey || '?'}
                    </motion.span>
                  </div>
                </div>
              </div>

              {/* Beat progress bar */}
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  height: 6,
                  background: 'rgba(0,240,255,0.08)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  border: '1px solid rgba(0,240,255,0.15)',
                }}>
                  <motion.div
                    style={{
                      height: '100%',
                      width: `${beatProgress * 100}%`,
                      background: 'linear-gradient(90deg, #00f0ff, #ff0066)',
                      boxShadow: '0 0 8px rgba(0,240,255,0.4)',
                      borderRadius: 3,
                    }}
                  />
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 4,
                  fontSize: 9,
                  color: 'rgba(0,240,255,0.3)',
                  letterSpacing: 1,
                  fontFamily: "'Orbitron', sans-serif",
                }}>
                  <span>ビートタイミング</span>
                  <span>{currentBeat + 1} / {totalBeats}</span>
                </div>
              </div>

              {/* Key buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}>
                {AVAILABLE_KEYS.map((key) => {
                  const color = KEY_COLORS[key] || '#ffffff';
                  const isPressed = currentKey === key;

                  return (
                    <motion.button
                      key={key}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      animate={isPressed ? {
                        boxShadow: [`0 0 4px ${color}40`, `0 0 24px ${color}`, `0 0 4px ${color}40`],
                      } : {}}
                      transition={{ duration: 0.2 }}
                      onClick={() => handlePress(key)}
                      style={{
                        width: 68,
                        height: 68,
                        background: isPressed
                          ? `linear-gradient(135deg, ${color}40, ${color}20)`
                          : 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.08))',
                        border: `2px solid ${isPressed ? color : `${color}50`}`,
                        borderRadius: 4,
                        color: isPressed ? '#ffffff' : color,
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: 22,
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        textShadow: isPressed ? `0 0 12px ${color}` : 'none',
                        transition: 'background 0.1s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {key}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* --- FINISHED PHASE --- */}
          {phase === 'finished' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                textAlign: 'center',
                padding: '40px 20px',
              }}
            >
              {/* Score display */}
              <div style={{
                fontSize: 48,
                fontFamily: "'Orbitron', sans-serif",
                fontWeight: 'bold',
                marginBottom: 8,
                color: correctCount === totalBeats ? '#33ff66' : '#ffaa00',
                textShadow: correctCount === totalBeats
                  ? '0 0 20px rgba(51,255,102,0.5)'
                  : '0 0 20px rgba(255,170,0,0.5)',
              }}>
                {correctCount}/{totalBeats}
              </div>
              <div style={{
                fontSize: 14,
                fontFamily: "'Orbitron', sans-serif",
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: 2,
                marginBottom: 24,
              }}>
                正解
              </div>

              {/* Beat results summary */}
              <div style={{
                display: 'flex',
                gap: 4,
                justifyContent: 'center',
                marginBottom: 24,
                flexWrap: 'wrap',
              }}>
                {beatResults.map((result, i) => (
                  <div
                    key={i}
                    style={{
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 8,
                      fontFamily: "'Orbitron', sans-serif",
                      background: result === 'correct'
                        ? 'rgba(51,255,102,0.3)'
                        : 'rgba(255,34,68,0.3)',
                      border: `1px solid ${result === 'correct' ? 'rgba(51,255,102,0.5)' : 'rgba(255,34,68,0.5)'}`,
                      color: result === 'correct' ? '#33ff66' : '#ff3333',
                    }}
                  >
                    {result === 'correct' ? '+' : 'x'}
                  </div>
                ))}
              </div>

              {correctCount === totalBeats ? (
                <div style={{
                  fontSize: 16,
                  fontFamily: "'Orbitron', sans-serif",
                  color: '#33ff66',
                  letterSpacing: 3,
                  textShadow: '0 0 12px rgba(51,255,102,0.4)',
                }}>
                  バイパス完了
                </div>
              ) : (
                <div style={{
                  fontSize: 13,
                  color: 'rgba(255,170,0,0.6)',
                  letterSpacing: 2,
                  fontFamily: "'Orbitron', sans-serif",
                }}>
                  再生ボタンで再挑戦
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Sequence progress bar (visible during playing and finished) */}
        {(phase === 'playing' || phase === 'finished') && (
          <div style={{ marginTop: 24, position: 'relative', zIndex: 3 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 10,
              color: 'rgba(255,0,102,0.4)',
              letterSpacing: 1,
              marginBottom: 6,
            }}>
              <span>シーケンス進捗</span>
              <span>{Math.min(currentBeat + 1, totalBeats)} / {totalBeats}</span>
            </div>
            <div style={{
              height: 4,
              background: 'rgba(255,0,102,0.1)',
              overflow: 'hidden',
            }}>
              <motion.div
                animate={{ width: `${(Math.min(currentBeat + 1, totalBeats) / totalBeats) * 100}%` }}
                transition={{ duration: 0.3 }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #ff0066, #ffaa00)',
                  boxShadow: '0 0 8px rgba(255,0,102,0.4)',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -- Main Component ------------------------------------------------- */

export default function ReflexBurstPuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
