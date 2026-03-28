// ===== STATIC ORBIT — Logic Gate Puzzle =====

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

/* ── Color map for display ─────────────────────────────────── */

const COLOR_HEX: Record<string, string> = {
  red: '#ff2244',
  blue: '#4488ff',
  green: '#33ff66',
  yellow: '#ffdd00',
};

const COLOR_BG: Record<string, string> = {
  red: 'rgba(255,34,68,0.25)',
  blue: 'rgba(68,136,255,0.25)',
  green: 'rgba(51,255,102,0.25)',
  yellow: 'rgba(255,221,0,0.25)',
};

const COLOR_BORDER: Record<string, string> = {
  red: 'rgba(255,34,68,0.6)',
  blue: 'rgba(68,136,255,0.6)',
  green: 'rgba(51,255,102,0.6)',
  yellow: 'rgba(255,221,0,0.6)',
};

/* ── Highlight color words in clue text ────────────────────── */

function renderClueText(clue: string): React.ReactNode {
  const colorWords = ['red', 'blue', 'green', 'yellow'];
  // Split on color words, preserving them
  const regex = new RegExp(`(${colorWords.join('|')})`, 'gi');
  const parts = clue.split(regex);

  return parts.map((part, i) => {
    const lower = part.toLowerCase();
    if (colorWords.includes(lower)) {
      return (
        <span
          key={i}
          style={{
            color: COLOR_HEX[lower] || '#ffffff',
            fontWeight: 'bold',
            textShadow: `0 0 6px ${COLOR_HEX[lower]}60`,
          }}
        >
          {part}
        </span>
      );
    }
    // Highlight element names (Node-X pattern)
    if (/^Node-[A-Z]$/i.test(part.trim())) {
      return (
        <span key={i} style={{ color: '#00f0ff', fontWeight: 'bold' }}>
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function highlightClue(clue: string): React.ReactNode {
  // First split by Node-X patterns, then by color words within each segment
  const nodeRegex = /(Node-[A-Z])/g;
  const nodeParts = clue.split(nodeRegex);

  return nodeParts.map((segment, i) => {
    if (/^Node-[A-Z]$/.test(segment)) {
      return (
        <span
          key={`n${i}`}
          style={{
            color: '#00f0ff',
            fontWeight: 'bold',
            textShadow: '0 0 6px rgba(0,240,255,0.4)',
          }}
        >
          {segment}
        </span>
      );
    }
    return <span key={`s${i}`}>{renderClueText(segment)}</span>;
  });
}

/* ── Observer View ─────────────────────────────────────────── */

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const clues = roleData.clues as string[];
  const elementNames = roleData.elementNames as string[];

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
          <div style={{ marginBottom: 4 }}>/// ロジックマトリクス -- 制約を伝達せよ ///</div>
          <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.5)', letterSpacing: 2 }}>
            {elementNames.length}個の要素を割り当て
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 3 }}>
          {clues.map((clue, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '10px 16px',
                marginBottom: 6,
                background: 'linear-gradient(90deg, rgba(0,240,255,0.03), rgba(0,240,255,0.06), rgba(0,240,255,0.03))',
                borderLeft: '3px solid rgba(0,240,255,0.4)',
                clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
              }}
            >
              {/* Line number */}
              <span style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 9,
                color: 'rgba(0,240,255,0.3)',
                minWidth: 28,
                letterSpacing: 1,
              }}>
                [{String(i + 1).padStart(2, '0')}]
              </span>

              {/* Clue text */}
              <span style={{
                fontSize: 13,
                lineHeight: '1.5',
                letterSpacing: 0.5,
              }}>
                {highlightClue(clue)}
              </span>
            </motion.div>
          ))}
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
          {clues.length}個の論理制約 -- オペレーターに伝えて割り当てさせてください
        </div>
      </div>
    </div>
  );
}

/* ── Operator View ─────────────────────────────────────────── */

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const elementNames = roleData.elementNames as string[];
  const availableColors = roleData.availableColors as string[];
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const name of elementNames) {
      init[name] = '';
    }
    return init;
  });

  const handleColorSelect = useCallback((element: string, color: string) => {
    setAssignments((prev) => ({
      ...prev,
      [element]: prev[element] === color ? '' : color,
    }));
  }, []);

  const handleValidate = useCallback(() => {
    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'logic-gate',
      action: 'assign',
      data: { assignments },
    });
  }, [assignments]);

  const assignedCount = Object.values(assignments).filter(Boolean).length;

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
          <div style={{ marginBottom: 4 }}>/// ロジックマトリクス割当 ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,0,102,0.5)', letterSpacing: 2 }}>
            各要素に色を割り当てよ
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

        {/* Element cards */}
        <div style={{
          position: 'relative',
          zIndex: 3,
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(elementNames.length, 3)}, 1fr)`,
          gap: 12,
        }}>
          {elementNames.map((name, i) => {
            const selectedColor = assignments[name];

            return (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                style={{
                  padding: 16,
                  background: selectedColor
                    ? COLOR_BG[selectedColor]
                    : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selectedColor
                    ? COLOR_BORDER[selectedColor]
                    : 'rgba(255,0,102,0.2)'}`,
                  clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                  transition: 'background 0.3s ease, border-color 0.3s ease',
                }}
              >
                {/* Element name */}
                <div style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 13,
                  letterSpacing: 2,
                  color: selectedColor ? COLOR_HEX[selectedColor] : '#00f0ff',
                  textShadow: selectedColor ? `0 0 8px ${COLOR_HEX[selectedColor]}60` : 'none',
                  textAlign: 'center',
                  marginBottom: 14,
                  paddingBottom: 8,
                  borderBottom: `1px solid ${selectedColor
                    ? `${COLOR_HEX[selectedColor]}30`
                    : 'rgba(255,0,102,0.15)'}`,
                }}>
                  {name}
                </div>

                {/* Color selection circles */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 10,
                }}>
                  {availableColors.map((color) => {
                    const isSelected = selectedColor === color;
                    return (
                      <motion.button
                        key={color}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.85 }}
                        onClick={() => handleColorSelect(name, color)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: isSelected
                            ? COLOR_HEX[color]
                            : `${COLOR_HEX[color]}30`,
                          border: `2px solid ${isSelected ? COLOR_HEX[color] : `${COLOR_HEX[color]}60`}`,
                          cursor: 'pointer',
                          boxShadow: isSelected
                            ? `0 0 12px ${COLOR_HEX[color]}80, inset 0 0 6px ${COLOR_HEX[color]}40`
                            : 'none',
                          transition: 'all 0.2s ease',
                          padding: 0,
                        }}
                      />
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Validate button */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: 24,
          position: 'relative',
          zIndex: 3,
        }}>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleValidate}
            disabled={assignedCount < elementNames.length}
            style={{
              background: assignedCount >= elementNames.length
                ? 'linear-gradient(135deg, rgba(255,0,102,0.3), rgba(255,0,102,0.5))'
                : 'rgba(255,255,255,0.05)',
              border: `1px solid ${assignedCount >= elementNames.length
                ? 'rgba(255,0,102,0.7)'
                : 'rgba(255,255,255,0.1)'}`,
              color: assignedCount >= elementNames.length ? '#ff0066' : 'rgba(255,255,255,0.3)',
              padding: '12px 48px',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 13,
              letterSpacing: 3,
              cursor: assignedCount >= elementNames.length ? 'pointer' : 'not-allowed',
              clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
              textShadow: assignedCount >= elementNames.length
                ? '0 0 8px rgba(255,0,102,0.5)'
                : 'none',
            }}
          >
            検証
          </motion.button>
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
            <span>割当済み要素</span>
            <span>{assignedCount} / {elementNames.length}</span>
          </div>
          <div style={{
            height: 4,
            background: 'rgba(255,0,102,0.1)',
            overflow: 'hidden',
          }}>
            <motion.div
              animate={{ width: `${(assignedCount / elementNames.length) * 100}%` }}
              transition={{ duration: 0.5 }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #ff0066, #aa66ff)',
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

export default function LogicGatePuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
