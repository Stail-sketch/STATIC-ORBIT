// ===== STATIC ORBIT — Grid Sync Puzzle =====

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../hooks/useSocket';
import { useGameStore } from '../../stores/gameStore';

interface PuzzleProps {
  roleData: Record<string, unknown>;
  role: 'observer' | 'operator' | 'navigator' | 'hacker';
}

// --- Shared Styles ---

const containerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 800,
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

// Helper: row label (A, B, C, ...)
function rowLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

// Helper: cell label (A1, B3, etc.)
function cellLabel(row: number, col: number): string {
  return `${rowLabel(row)}${col + 1}`;
}

// ===== OBSERVER VIEW =====

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const targetPattern = roleData.targetPattern as boolean[][];
  const size = targetPattern.length;

  // Count filled cells
  const filledCount = targetPattern.flat().filter(Boolean).length;
  const totalCells = size * size;

  // Compute responsive cell size
  const maxGridWidth = 500;
  const cellSize = Math.min(Math.floor(maxGridWidth / (size + 1)), 52);

  return (
    <div style={containerStyle}>
      <div style={panelStyle}>
        <div style={scanlineOverlay} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={headerStyle}>
          <div style={{ marginBottom: 4 }}>/// 目標パターン ///</div>
          <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.5)', letterSpacing: 2 }}>
            座標をオペレーターに伝えてください
          </div>
        </div>

        {/* Grid */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 3,
        }}>
          <div>
            {/* Column Headers */}
            <div style={{ display: 'flex', marginLeft: cellSize + 2 }}>
              {Array.from({ length: size }, (_, col) => (
                <div
                  key={col}
                  style={{
                    width: cellSize,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    color: 'rgba(0,240,255,0.5)',
                    fontFamily: "'Orbitron', sans-serif",
                    letterSpacing: 1,
                  }}
                >
                  {col + 1}
                </div>
              ))}
            </div>

            {/* Rows */}
            {targetPattern.map((row, rowIdx) => (
              <div key={rowIdx} style={{ display: 'flex' }}>
                {/* Row Label */}
                <div style={{
                  width: cellSize,
                  height: cellSize,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: 'rgba(0,240,255,0.5)',
                  fontFamily: "'Orbitron', sans-serif",
                  letterSpacing: 1,
                  flexShrink: 0,
                }}>
                  {rowLabel(rowIdx)}
                </div>

                {/* Cells */}
                {row.map((filled, colIdx) => (
                  <motion.div
                    key={`${rowIdx}-${colIdx}`}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: (rowIdx * size + colIdx) * 0.015,
                      duration: 0.3,
                    }}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      border: '1px solid rgba(0,240,255,0.12)',
                      background: filled
                        ? 'linear-gradient(135deg, rgba(0,240,255,0.6) 0%, rgba(0,200,255,0.4) 100%)'
                        : 'rgba(0,5,15,0.6)',
                      boxShadow: filled
                        ? '0 0 8px rgba(0,240,255,0.3), inset 0 0 6px rgba(0,240,255,0.2)'
                        : 'inset 0 0 4px rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    {filled && (
                      <div style={{
                        width: '60%',
                        height: '60%',
                        background: 'rgba(0,240,255,0.3)',
                        borderRadius: 1,
                      }} />
                    )}
                    {/* Tooltip-style cell label on hover — CSS not available, use title */}
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend / Stats */}
        <div style={{
          marginTop: 20,
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          position: 'relative',
          zIndex: 3,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 14,
              height: 14,
              background: 'linear-gradient(135deg, rgba(0,240,255,0.6), rgba(0,200,255,0.4))',
              border: '1px solid rgba(0,240,255,0.3)',
            }} />
            <span style={{ fontSize: 10, color: 'rgba(0,240,255,0.5)', letterSpacing: 1 }}>
              有効 ({filledCount})
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 14,
              height: 14,
              background: 'rgba(0,5,15,0.6)',
              border: '1px solid rgba(0,240,255,0.12)',
            }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>
              無効 ({totalCells - filledCount})
            </span>
          </div>
        </div>

        {/* Active cells list removed — grid itself is sufficient */}
      </div>
    </div>
  );
}

// ===== OPERATOR VIEW =====

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const gridSize = roleData.gridSize as number;
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [grid, setGrid] = useState<boolean[][]>(() =>
    Array.from({ length: gridSize }, () => Array(gridSize).fill(false))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleCell = useCallback((row: number, col: number) => {
    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = !next[row][col];
      return next;
    });
  }, []);

  const clearGrid = useCallback(() => {
    setGrid(Array.from({ length: gridSize }, () => Array(gridSize).fill(false)));
  }, [gridSize]);

  const handleSubmit = useCallback(() => {
    setIsSubmitting(true);
    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'grid-sync',
      action: 'submit-grid',
      data: { grid },
    });
    setTimeout(() => setIsSubmitting(false), 500);
  }, [grid]);

  const filledCount = grid.flat().filter(Boolean).length;

  const maxGridWidth = 500;
  const cellSize = Math.min(Math.floor(maxGridWidth / (gridSize + 1)), 52);

  return (
    <div style={containerStyle}>
      <div style={{
        ...panelStyle,
        background: 'linear-gradient(135deg, rgba(10,0,20,0.95) 0%, rgba(20,0,30,0.9) 100%)',
        border: '1px solid rgba(255,0,100,0.25)',
      }}>
        <div style={scanlineOverlay} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={{
          ...headerStyle,
          color: '#ff0066',
          borderBottomColor: 'rgba(255,0,102,0.2)',
        }}>
          <div style={{ marginBottom: 4 }}>/// グリッド同期コンソール ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,0,102,0.5)', letterSpacing: 2 }}>
            目標パターンを再現せよ
          </div>
        </div>

        {/* Feedback Display */}
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

        {/* Interactive Grid */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 3,
        }}>
          <div>
            {/* Column Headers */}
            <div style={{ display: 'flex', marginLeft: cellSize + 2 }}>
              {Array.from({ length: gridSize }, (_, col) => (
                <div
                  key={col}
                  style={{
                    width: cellSize,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    color: 'rgba(255,0,102,0.4)',
                    fontFamily: "'Orbitron', sans-serif",
                    letterSpacing: 1,
                  }}
                >
                  {col + 1}
                </div>
              ))}
            </div>

            {/* Rows */}
            {grid.map((row, rowIdx) => (
              <div key={rowIdx} style={{ display: 'flex' }}>
                {/* Row Label */}
                <div style={{
                  width: cellSize,
                  height: cellSize,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: 'rgba(255,0,102,0.4)',
                  fontFamily: "'Orbitron', sans-serif",
                  letterSpacing: 1,
                  flexShrink: 0,
                }}>
                  {rowLabel(rowIdx)}
                </div>

                {/* Cells */}
                {row.map((filled, colIdx) => (
                  <motion.div
                    key={`${rowIdx}-${colIdx}`}
                    whileHover={{
                      borderColor: 'rgba(0,240,255,0.5)',
                      boxShadow: '0 0 12px rgba(0,240,255,0.2)',
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleCell(rowIdx, colIdx)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      delay: (rowIdx * gridSize + colIdx) * 0.01,
                      duration: 0.2,
                    }}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      border: filled
                        ? '1px solid rgba(0,240,255,0.35)'
                        : '1px solid rgba(255,0,102,0.12)',
                      background: filled
                        ? 'linear-gradient(135deg, rgba(0,240,255,0.55) 0%, rgba(0,200,255,0.35) 100%)'
                        : 'rgba(15,0,25,0.6)',
                      boxShadow: filled
                        ? '0 0 10px rgba(0,240,255,0.25), inset 0 0 8px rgba(0,240,255,0.15)'
                        : 'inset 0 0 4px rgba(0,0,0,0.4)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                      userSelect: 'none',
                    }}
                  >
                    <AnimatePresence>
                      {filled && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: 'tween', duration: 0.15 }}
                          style={{
                            width: '55%',
                            height: '55%',
                            background: 'rgba(0,240,255,0.4)',
                            borderRadius: 1,
                            boxShadow: '0 0 6px rgba(0,240,255,0.3)',
                          }}
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div style={{
          marginTop: 20,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 16,
          position: 'relative',
          zIndex: 3,
        }}>
          {/* Cell count */}
          <div style={{
            fontSize: 10,
            color: 'rgba(255,0,102,0.4)',
            letterSpacing: 1,
          }}>
            有効: {filledCount} / {gridSize * gridSize}
          </div>

          {/* Clear Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={clearGrid}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.4)',
              padding: '8px 20px',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 10,
              letterSpacing: 2,
              cursor: 'pointer',
              clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
            }}
          >
            クリア
          </motion.button>

          {/* Sync Button */}
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 24px rgba(0,240,255,0.3)' }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              background: 'linear-gradient(135deg, rgba(0,240,255,0.15) 0%, rgba(0,240,255,0.3) 100%)',
              border: '1px solid rgba(0,240,255,0.4)',
              color: '#00f0ff',
              padding: '10px 36px',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 13,
              letterSpacing: 4,
              cursor: 'pointer',
              clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
              boxShadow: '0 0 12px rgba(0,240,255,0.15)',
              transition: 'all 0.3s ease',
            }}
          >
            {isSubmitting ? '...' : '同期'}
          </motion.button>
        </div>

        {/* Coordinate list removed — grid itself is sufficient */}
      </div>
    </div>
  );
}

// ===== MAIN COMPONENT =====

export default function GridSyncPuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
