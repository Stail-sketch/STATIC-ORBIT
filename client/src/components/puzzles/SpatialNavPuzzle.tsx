// ===== STATIC ORBIT — Spatial Nav Puzzle =====

import { useState, useCallback, useEffect } from 'react';
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

/* ── Cell colors ───────────────────────────────────────────── */

const CELL_COLORS: Record<string, string> = {
  wall: '#0a0a14',
  open: '#1a1e2e',
  start: '#00f0ff',
  exit: '#33ff66',
  hazard: '#ff2244',
};

const CELL_BORDERS: Record<string, string> = {
  wall: 'rgba(30,30,50,0.8)',
  open: 'rgba(60,70,100,0.3)',
  start: 'rgba(0,240,255,0.6)',
  exit: 'rgba(51,255,102,0.6)',
  hazard: 'rgba(255,34,68,0.6)',
};

/* ── Observer View ─────────────────────────────────────────── */

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const fullMap = roleData.fullMap as string[][];
  const startPos = roleData.startPos as { x: number; y: number };
  const exitPos = roleData.exitPos as { x: number; y: number };
  const mapSize = roleData.mapSize as number;

  const cellSize = Math.min(Math.floor(600 / mapSize), 48);

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
          <div style={{ marginBottom: 4 }}>/// STATION BLUEPRINT — NAVIGATE THE OPERATIVE ///</div>
          <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.5)', letterSpacing: 2 }}>
            RELAY COORDINATES TO OPERATOR
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 3 }}>
          {/* Column labels */}
          <div style={{ display: 'flex', marginLeft: cellSize + 4, marginBottom: 2 }}>
            {Array.from({ length: mapSize }, (_, i) => (
              <div
                key={i}
                style={{
                  width: cellSize,
                  textAlign: 'center',
                  fontSize: 9,
                  color: 'rgba(0,240,255,0.4)',
                  fontFamily: "'Orbitron', sans-serif",
                  letterSpacing: 1,
                }}
              >
                {String.fromCharCode(65 + i)}
              </div>
            ))}
          </div>

          {/* Map grid */}
          {fullMap.map((row, y) => (
            <div key={y} style={{ display: 'flex', alignItems: 'center' }}>
              {/* Row label */}
              <div
                style={{
                  width: cellSize,
                  textAlign: 'center',
                  fontSize: 9,
                  color: 'rgba(0,240,255,0.4)',
                  fontFamily: "'Orbitron', sans-serif",
                  letterSpacing: 1,
                }}
              >
                {y + 1}
              </div>
              {row.map((cell, x) => (
                <motion.div
                  key={`${x}-${y}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: (x + y) * 0.01 }}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    background: CELL_COLORS[cell] || '#1a1e2e',
                    border: `1px solid ${CELL_BORDERS[cell] || 'rgba(60,70,100,0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8,
                    color: 'rgba(255,255,255,0.5)',
                    boxShadow: cell === 'start' || cell === 'exit' || cell === 'hazard'
                      ? `inset 0 0 8px ${CELL_BORDERS[cell]}`
                      : 'none',
                  }}
                >
                  {cell === 'start' && (
                    <span style={{ fontSize: 10, color: '#00f0ff', textShadow: '0 0 6px #00f0ff' }}>S</span>
                  )}
                  {cell === 'exit' && (
                    <span style={{ fontSize: 10, color: '#33ff66', textShadow: '0 0 6px #33ff66' }}>E</span>
                  )}
                  {cell === 'hazard' && (
                    <span style={{ fontSize: 10, color: '#ff2244', textShadow: '0 0 6px #ff2244' }}>!</span>
                  )}
                </motion.div>
              ))}
            </div>
          ))}

          {/* Legend */}
          <div style={{
            display: 'flex',
            gap: 16,
            marginTop: 16,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            {[
              { label: 'WALL', color: CELL_COLORS.wall, border: CELL_BORDERS.wall },
              { label: 'OPEN', color: CELL_COLORS.open, border: CELL_BORDERS.open },
              { label: 'START', color: CELL_COLORS.start, border: CELL_BORDERS.start },
              { label: 'EXIT', color: CELL_COLORS.exit, border: CELL_BORDERS.exit },
              { label: 'HAZARD', color: CELL_COLORS.hazard, border: CELL_BORDERS.hazard },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 12,
                  height: 12,
                  background: item.color,
                  border: `1px solid ${item.border}`,
                }} />
                <span style={{
                  fontSize: 9,
                  letterSpacing: 1,
                  color: 'rgba(0,240,255,0.5)',
                  fontFamily: "'Orbitron', sans-serif",
                }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 16,
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
          GRID {mapSize}x{mapSize} -- START ({String.fromCharCode(65 + startPos.x)}{startPos.y + 1}) -- EXIT ({String.fromCharCode(65 + exitPos.x)}{exitPos.y + 1})
        </div>
      </div>
    </div>
  );
}

/* ── Operator View ─────────────────────────────────────────── */

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const visibleRadius = roleData.visibleRadius as number;
  const initialPos = roleData.currentPos as { x: number; y: number };
  const mapSize = roleData.mapSize as number;
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const [currentPos, setCurrentPos] = useState(initialPos);
  const [moveCount, setMoveCount] = useState(0);
  const [visitedCells, setVisitedCells] = useState<Set<string>>(() => new Set([`${initialPos.x},${initialPos.y}`]));

  const cellSize = Math.min(Math.floor(500 / mapSize), 42);

  const handleMove = useCallback((direction: string) => {
    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'spatial-nav',
      action: 'move',
      data: { direction },
    });
    setMoveCount((c) => c + 1);

    // Optimistic position update
    const delta: Record<string, { dx: number; dy: number }> = {
      up: { dx: 0, dy: -1 },
      down: { dx: 0, dy: 1 },
      left: { dx: -1, dy: 0 },
      right: { dx: 1, dy: 0 },
    };
    const d = delta[direction];
    if (d) {
      const nx = currentPos.x + d.dx;
      const ny = currentPos.y + d.dy;
      if (nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize) {
        setCurrentPos({ x: nx, y: ny });
        setVisitedCells((prev) => new Set(prev).add(`${nx},${ny}`));
      }
    }
  }, [currentPos, mapSize]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if typing in an input
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;

      const keyMap: Record<string, string> = {
        w: 'up', W: 'up', ArrowUp: 'up',
        s: 'down', S: 'down', ArrowDown: 'down',
        a: 'left', A: 'left', ArrowLeft: 'left',
        d: 'right', D: 'right', ArrowRight: 'right',
      };
      const direction = keyMap[e.key];
      if (direction) {
        e.preventDefault();
        handleMove(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove]);

  // Generate fog-of-war grid
  const renderGrid = () => {
    const rows = [];
    for (let y = 0; y < mapSize; y++) {
      const cells = [];
      for (let x = 0; x < mapSize; x++) {
        const dist = Math.abs(x - currentPos.x) + Math.abs(y - currentPos.y);
        const isVisible = dist <= visibleRadius;
        const isPlayer = x === currentPos.x && y === currentPos.y;
        const wasVisited = visitedCells.has(`${x},${y}`);

        cells.push(
          <div
            key={`${x}-${y}`}
            style={{
              width: cellSize,
              height: cellSize,
              background: isVisible
                ? (isPlayer ? 'rgba(255,0,102,0.3)' : 'rgba(30,35,55,0.8)')
                : (wasVisited ? 'rgba(15,15,25,0.6)' : 'rgba(5,5,10,0.95)'),
              border: isVisible
                ? `1px solid ${isPlayer ? 'rgba(255,0,102,0.8)' : 'rgba(100,110,150,0.3)'}`
                : '1px solid rgba(20,20,30,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              // Static noise for fog-of-war
              ...(!isVisible && !wasVisited ? {
                backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 4 4\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect x=\'0\' y=\'0\' width=\'1\' height=\'1\' fill=\'rgba(255,255,255,0.02)\'/%3E%3Crect x=\'2\' y=\'1\' width=\'1\' height=\'1\' fill=\'rgba(255,255,255,0.03)\'/%3E%3Crect x=\'1\' y=\'3\' width=\'1\' height=\'1\' fill=\'rgba(255,255,255,0.02)\'/%3E%3Crect x=\'3\' y=\'2\' width=\'1\' height=\'1\' fill=\'rgba(255,255,255,0.04)\'/%3E%3C/svg%3E")',
                backgroundSize: '4px 4px',
              } : {}),
            }}
          >
            {isPlayer && (
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [1, 0.6, 1],
                }}
                transition={{ duration: 1.2, repeat: Infinity }}
                style={{
                  width: cellSize * 0.5,
                  height: cellSize * 0.5,
                  borderRadius: '50%',
                  background: '#ff0066',
                  boxShadow: '0 0 12px rgba(255,0,102,0.8), 0 0 24px rgba(255,0,102,0.4)',
                }}
              />
            )}
          </div>
        );
      }
      rows.push(
        <div key={y} style={{ display: 'flex' }}>
          {cells}
        </div>
      );
    }
    return rows;
  };

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
          <div style={{ marginBottom: 4 }}>/// SPATIAL NAVIGATION ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,0,102,0.5)', letterSpacing: 2 }}>
            NAVIGATE TO THE EXIT POINT
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

        {/* Grid */}
        <div style={{
          position: 'relative',
          zIndex: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{
            border: '1px solid rgba(255,0,102,0.2)',
            padding: 4,
            background: 'rgba(0,0,0,0.3)',
          }}>
            {renderGrid()}
          </div>

          {/* Direction controls */}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleMove('up')}
              style={arrowButtonStyle}
            >
              W ▲
            </motion.button>
            <div style={{ display: 'flex', gap: 4 }}>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleMove('left')}
                style={arrowButtonStyle}
              >
                ◄ A
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleMove('down')}
                style={arrowButtonStyle}
              >
                S ▼
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleMove('right')}
                style={arrowButtonStyle}
              >
                D ►
              </motion.button>
            </div>
          </div>

          {/* Move counter */}
          <div style={{
            marginTop: 16,
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
          }}>
            <div style={{
              padding: '6px 16px',
              background: 'rgba(255,0,102,0.06)',
              border: '1px solid rgba(255,0,102,0.2)',
              fontSize: 11,
              letterSpacing: 1,
              color: 'rgba(255,0,102,0.7)',
              fontFamily: "'Orbitron', sans-serif",
            }}>
              MOVES: {moveCount}
            </div>
            <div style={{
              padding: '6px 16px',
              background: 'rgba(255,0,102,0.06)',
              border: '1px solid rgba(255,0,102,0.2)',
              fontSize: 11,
              letterSpacing: 1,
              color: 'rgba(255,0,102,0.7)',
              fontFamily: "'Orbitron', sans-serif",
            }}>
              POS: ({String.fromCharCode(65 + currentPos.x)}{currentPos.y + 1})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Arrow Button Style ────────────────────────────────────── */

const arrowButtonStyle: React.CSSProperties = {
  width: 64,
  height: 40,
  background: 'linear-gradient(135deg, rgba(255,0,102,0.15), rgba(255,0,102,0.3))',
  border: '1px solid rgba(255,0,102,0.5)',
  color: '#ff0066',
  fontFamily: "'Share Tech Mono', monospace",
  fontSize: 12,
  letterSpacing: 1,
  cursor: 'pointer',
  clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
};

/* ── Main Component ────────────────────────────────────────── */

export default function SpatialNavPuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
