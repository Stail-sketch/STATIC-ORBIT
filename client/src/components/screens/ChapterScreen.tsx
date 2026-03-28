import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { useAudio } from '../../audio/useAudio';
import { getSocket } from '../../hooks/useSocket';

type Phase = 'black' | 'chapterNum' | 'title' | 'subtitle' | 'fadeTitle' | 'lines';

const ChapterScreen: React.FC = () => {
  const chapterData = useGameStore((s) => s.chapterData);
  const isHost = useGameStore((s) => s.isHost);
  const roomCode = useGameStore((s) => s.roomCode);
  const audio = useAudio();
  const [phase, setPhase] = useState<Phase>('black');
  const [currentLine, setCurrentLine] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [allLinesFinished, setAllLinesFinished] = useState(false);
  const [currentLineTyped, setCurrentLineTyped] = useState(false);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (!chapterData) return null;

  const { chapterNumber, title, subtitle, lines } = chapterData;

  // Phase sequencing
  useEffect(() => {
    audio.playSFX('phaseChange');

    const timers: ReturnType<typeof setTimeout>[] = [];

    // 0.5s: show chapter number
    timers.push(setTimeout(() => setPhase('chapterNum'), 500));
    // 1s: slam in title
    timers.push(setTimeout(() => setPhase('title'), 1000));
    // 1.5s: show subtitle
    timers.push(setTimeout(() => setPhase('subtitle'), 1500));
    // 2.5s: fade out title block
    timers.push(setTimeout(() => setPhase('fadeTitle'), 2500));
    // 3s: start lines
    timers.push(setTimeout(() => setPhase('lines'), 3000));

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Typewriter effect for story lines
  useEffect(() => {
    if (phase !== 'lines') return;

    if (currentLine >= lines.length) {
      setAllLinesFinished(true);
      return;
    }

    const text = lines[currentLine];
    let charIndex = 0;
    setDisplayedText('');
    setCurrentLineTyped(false);

    typewriterRef.current = setInterval(() => {
      charIndex++;
      setDisplayedText(text.slice(0, charIndex));
      if (charIndex >= text.length) {
        if (typewriterRef.current) clearInterval(typewriterRef.current);
        setCurrentLineTyped(true);
      }
    }, 35);

    return () => {
      if (typewriterRef.current) clearInterval(typewriterRef.current);
    };
  }, [phase, currentLine, lines]);

  // Auto-advance lines after typewriter finishes + reading time
  useEffect(() => {
    if (phase !== 'lines') return;
    if (!currentLineTyped) return;
    if (currentLine >= lines.length) return;

    // Give reading time after typewriter finishes, then advance to next line
    const readingTime = Math.max(1200, lines[currentLine].length * 25);
    const timer = setTimeout(() => {
      setCurrentLine((prev) => prev + 1);
    }, readingTime);

    return () => clearTimeout(timer);
  }, [phase, currentLineTyped, currentLine, lines]);

  const handleChapterDone = () => {
    if (!roomCode) return;
    const socket = getSocket();
    socket.emit('game:chapterDone', { roomCode });
  };

  const showChapterNum = phase !== 'black';
  const showTitleBlock = phase !== 'black' && phase !== 'chapterNum' && phase !== 'fadeTitle' && phase !== 'lines';
  const showSubtitle = phase === 'subtitle';
  const showLines = phase === 'lines';

  return (
    <div style={styles.container}>
      <AnimatePresence>
        {/* Chapter number */}
        {showChapterNum && phase !== 'lines' && phase !== 'fadeTitle' && (
          <motion.div
            key="chapter-num"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            transition={{ duration: 0.5 }}
            style={styles.chapterNum}
          >
            {chapterNumber === 0 ? 'PROLOGUE' : `CHAPTER ${chapterNumber}`}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* Title block */}
        {showTitleBlock && (
          <motion.div
            key="title-block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            style={styles.titleBlock}
          >
            {/* Title - slams in */}
            <motion.div
              initial={{ opacity: 0, scale: 1.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={styles.title}
            >
              {title}
            </motion.div>

            {/* Horizontal line expanding from center */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 200, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
              style={styles.divider}
            />

            {/* Subtitle */}
            <AnimatePresence>
              {showSubtitle && (
                <motion.div
                  key="subtitle"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  style={styles.subtitle}
                >
                  {subtitle}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* Story lines */}
        {showLines && currentLine < lines.length && (
          <motion.div
            key={`line-${currentLine}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            transition={{ duration: 0.5 }}
            style={styles.lineContainer}
          >
            <div style={styles.lineText}>
              {displayedText}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
                style={styles.cursor}
              >
                |
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Next" button or waiting message after all lines are done */}
      <AnimatePresence>
        {showLines && allLinesFinished && (
          <motion.div
            key="chapter-done-action"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={styles.actionContainer}
          >
            {isHost ? (
              <motion.button
                onClick={handleChapterDone}
                style={styles.nextButton}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  boxShadow: [
                    '0 0 8px rgba(0,229,255,0.3)',
                    '0 0 20px rgba(0,229,255,0.6)',
                    '0 0 8px rgba(0,229,255,0.3)',
                  ],
                }}
                transition={{
                  boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                }}
              >
                {'次へ ▶'}
              </motion.button>
            ) : (
              <div style={styles.waitingText}>
                {'ホストの操作を待っています...'}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    overflow: 'hidden',
  },
  chapterNum: {
    position: 'absolute',
    top: '28%',
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '14px',
    color: '#666',
    letterSpacing: '6px',
    textTransform: 'uppercase' as const,
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '84px',
    fontWeight: 700,
    color: '#fff',
    textShadow: '0 0 40px rgba(255,255,255,0.15)',
    letterSpacing: '4px',
    lineHeight: 1,
  },
  divider: {
    height: '1px',
    backgroundColor: '#fff',
    marginTop: '4px',
    marginBottom: '4px',
  },
  subtitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '16px',
    color: '#00e5ff',
    letterSpacing: '8px',
    textTransform: 'uppercase' as const,
  },
  lineContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '700px',
    padding: '0 40px',
    textAlign: 'center' as const,
  },
  lineText: {
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: '20px',
    color: '#c0c0c0',
    lineHeight: 1.7,
    textAlign: 'center' as const,
  },
  cursor: {
    color: '#c0c0c0',
    fontWeight: 300,
    marginLeft: '2px',
  },
  actionContainer: {
    position: 'absolute' as const,
    bottom: '12%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButton: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '18px',
    fontWeight: 700,
    color: '#00e5ff',
    backgroundColor: 'transparent',
    border: '2px solid #00e5ff',
    padding: '14px 48px',
    cursor: 'pointer',
    letterSpacing: '3px',
    clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
    textTransform: 'uppercase' as const,
    transition: 'background-color 0.2s, color 0.2s',
  },
  waitingText: {
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: '16px',
    color: '#555',
    letterSpacing: '2px',
  },
};

export default ChapterScreen;
