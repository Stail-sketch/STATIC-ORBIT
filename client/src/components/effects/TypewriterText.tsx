import React, { useState, useEffect, useRef, useCallback } from 'react';

interface TypewriterTextProps {
  lines: string[];
  /** Milliseconds per character (default 40) */
  speed?: number;
  onComplete?: () => void;
  className?: string;
}

/**
 * Terminal-style typewriter that prints text character by character.
 * After each line, pauses briefly, then continues with the next.
 * Blinking block cursor sits at the insertion point.
 */
const TypewriterText: React.FC<TypewriterTextProps> = ({
  lines,
  speed = 40,
  onComplete,
  className = '',
}) => {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Build currently visible text
  const currentLineText = lines[lineIndex]?.slice(0, charIndex) ?? '';

  const advance = useCallback(() => {
    // still typing current line
    if (lineIndex < lines.length && charIndex < lines[lineIndex].length) {
      setCharIndex((c) => c + 1);
      return;
    }
    // finished current line — commit it and move on
    if (lineIndex < lines.length) {
      setDisplayedLines((prev) => [...prev, lines[lineIndex]]);
      if (lineIndex + 1 < lines.length) {
        setLineIndex((l) => l + 1);
        setCharIndex(0);
      } else {
        setDone(true);
        onCompleteRef.current?.();
      }
    }
  }, [lineIndex, charIndex, lines]);

  useEffect(() => {
    if (done) return;

    // Pause 400ms between lines (when charIndex === 0 and we already have committed lines)
    const isLinePause =
      charIndex === 0 && displayedLines.length > 0 && lineIndex < lines.length;
    const delay = isLinePause ? 400 : speed;

    const timer = setTimeout(advance, delay);
    return () => clearTimeout(timer);
  }, [advance, charIndex, displayedLines.length, lineIndex, lines.length, speed, done]);

  return (
    <div
      className={`terminal-text ${className}`}
      style={{
        fontSize: '0.95rem',
        lineHeight: 1.7,
      }}
    >
      {displayedLines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
      {!done && (
        <div>
          {currentLineText}
          <span className="cursor" />
        </div>
      )}
      {done && (
        <div>
          {/* show final line with blinking cursor */}
          <span className="cursor" />
        </div>
      )}
    </div>
  );
};

export default TypewriterText;
