// ===== STATIC ORBIT — Pipe Flow Puzzle =====

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
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.015) 2px, rgba(0,240,255,0.015) 4px)',
  pointerEvents: 'none',
  zIndex: 1,
};

const gridOverlay: React.CSSProperties = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundImage:
    'linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)',
  backgroundSize: '20px 20px',
  pointerEvents: 'none',
  zIndex: 0,
};

const cornerDecor = (position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 12, height: 12,
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

/* ── Pipe Rendering ────────────────────────────────────────── */

type PipeType = 'straight' | 'corner' | 'tee' | 'cross' | 'empty';

/** SVG pipe cell - renders pipe shape rotated by given degrees */
function PipeCellSVG({ pipeType, rotation, size, color }: {
  pipeType: PipeType;
  rotation: number;
  size: number;
  color: string;
}) {
  const half = size / 2;
  const strokeW = 4;

  const renderPipe = () => {
    switch (pipeType) {
      case 'straight':
        return <line x1={0} y1={half} x2={size} y2={half} stroke={color} strokeWidth={strokeW} />;
      case 'corner':
        return (
          <path d={`M 0 ${half} L ${half} ${half} L ${half} ${size}`}
            fill="none" stroke={color} strokeWidth={strokeW} strokeLinejoin="round" />
        );
      case 'tee':
        return (
          <>
            <line x1={0} y1={half} x2={size} y2={half} stroke={color} strokeWidth={strokeW} />
            <line x1={half} y1={half} x2={half} y2={size} stroke={color} strokeWidth={strokeW} />
          </>
        );
      case 'cross':
        return (
          <>
            <line x1={0} y1={half} x2={size} y2={half} stroke={color} strokeWidth={strokeW} />
            <line x1={half} y1={0} x2={half} y2={size} stroke={color} strokeWidth={strokeW} />
          </>
        );
      case 'empty':
      default:
        return null;
    }
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(${rotation}, ${half}, ${half})`}>
        {renderPipe()}
      </g>
      {/* Center dot */}
      {pipeType !== 'empty' && (
        <circle cx={half} cy={half} r={2} fill={color} opacity={0.6} />
      )}
    </svg>
  );
}

/* ── Observer View ─────────────────────────────────────────── */

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const grid = roleData.grid as Array<Array<{ pipeType: PipeType; rotation: number }>>;
  const rows = roleData.rows as number;
  const cols = roleData.cols as number;
  const cellSize = Math.min(60, Math.floor(700 / Math.max(rows, cols)));

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
          <div style={{ marginBottom: 4 }}>/// パイプフロー 正解配置 ///</div>
          <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.5)', letterSpacing: 2 }}>
            オペレーターにパイプの向きを伝えてください
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 3, display: 'flex', justifyContent: 'center' }}>
          <div>
            {/* Column labels */}
            <div style={{ display: 'flex', marginLeft: 28 }}>
              {Array.from({ length: cols }, (_, c) => (
                <div key={c} style={{
                  width: cellSize, textAlign: 'center',
                  fontSize: 9, color: 'rgba(0,240,255,0.4)',
                  fontFamily: "'Orbitron', sans-serif",
                }}>
                  {c + 1}
                </div>
              ))}
            </div>

            {grid.map((row, r) => (
              <div key={r} style={{ display: 'flex', alignItems: 'center' }}>
                {/* Row label */}
                <div style={{
                  width: 28, textAlign: 'center',
                  fontSize: 9, color: 'rgba(0,240,255,0.4)',
                  fontFamily: "'Orbitron', sans-serif",
                }}>
                  {String.fromCharCode(65 + r)}
                </div>

                {row.map((cell, c) => (
                  <div key={c} style={{
                    width: cellSize, height: cellSize,
                    border: '1px solid rgba(0,240,255,0.1)',
                    background: cell.pipeType !== 'empty'
                      ? 'rgba(0,240,255,0.03)'
                      : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <PipeCellSVG
                      pipeType={cell.pipeType}
                      rotation={cell.rotation}
                      size={cellSize - 4}
                      color="#00f0ff"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

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
          {rows}x{cols} グリッド -- 各パイプの正しい向きを伝達してください
        </div>
      </div>
    </div>
  );
}

/* ── Operator View ─────────────────────────────────────────── */

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const initialGrid = roleData.grid as Array<Array<{ pipeType: PipeType; rotation: number }>>;
  const rows = roleData.rows as number;
  const cols = roleData.cols as number;
  const lastFeedback = useGameStore((s) => s.lastFeedback);
  const cellSize = Math.min(60, Math.floor(700 / Math.max(rows, cols)));

  const [rotations, setRotations] = useState<number[][]>(() =>
    initialGrid.map(row => row.map(cell => cell.rotation))
  );

  const handleRotate = useCallback((r: number, c: number) => {
    const pipeType = initialGrid[r][c].pipeType;
    if (pipeType === 'empty' || pipeType === 'cross') return;
    setRotations(prev => {
      const next = prev.map(row => [...row]);
      next[r][c] = (next[r][c] + 90) % 360;
      return next;
    });
  }, [initialGrid]);

  const handleSubmit = useCallback(() => {
    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'pipe-flow',
      action: 'submit-pipes',
      data: { grid: rotations },
    });
  }, [rotations]);

  return (
    <div style={containerStyle}>
      <div style={operatorPanelStyle}>
        <div style={scanlineOverlay} />
        <div style={gridOverlay} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={{ ...headerStyle, color: '#ff0066', borderBottomColor: 'rgba(255,0,102,0.2)' }}>
          <div style={{ marginBottom: 4 }}>/// パイプフロー 配管修理 ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,0,102,0.5)', letterSpacing: 2 }}>
            パイプをクリックして回転させよ
          </div>
        </div>

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
                background: lastFeedback.correct ? 'rgba(51,255,102,0.1)' : 'rgba(255,51,51,0.1)',
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

        <div style={{ position: 'relative', zIndex: 3, display: 'flex', justifyContent: 'center' }}>
          <div>
            {/* Column labels */}
            <div style={{ display: 'flex', marginLeft: 28 }}>
              {Array.from({ length: cols }, (_, c) => (
                <div key={c} style={{
                  width: cellSize, textAlign: 'center',
                  fontSize: 9, color: 'rgba(255,0,102,0.4)',
                  fontFamily: "'Orbitron', sans-serif",
                }}>
                  {c + 1}
                </div>
              ))}
            </div>

            {initialGrid.map((row, r) => (
              <div key={r} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: 28, textAlign: 'center',
                  fontSize: 9, color: 'rgba(255,0,102,0.4)',
                  fontFamily: "'Orbitron', sans-serif",
                }}>
                  {String.fromCharCode(65 + r)}
                </div>

                {row.map((cell, c) => {
                  const isClickable = cell.pipeType !== 'empty' && cell.pipeType !== 'cross';
                  return (
                    <motion.div
                      key={c}
                      whileHover={isClickable ? { scale: 1.1 } : {}}
                      whileTap={isClickable ? { scale: 0.95 } : {}}
                      onClick={() => handleRotate(r, c)}
                      style={{
                        width: cellSize, height: cellSize,
                        border: '1px solid rgba(255,0,102,0.15)',
                        background: cell.pipeType !== 'empty'
                          ? 'rgba(255,0,102,0.03)'
                          : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: isClickable ? 'pointer' : 'default',
                        transition: 'background 0.15s',
                      }}
                    >
                      <PipeCellSVG
                        pipeType={cell.pipeType}
                        rotation={rotations[r][c]}
                        size={cellSize - 4}
                        color="#ff0066"
                      />
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, position: 'relative', zIndex: 3 }}>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(255,0,102,0.4)' }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            style={{
              background: 'linear-gradient(135deg, rgba(255,0,102,0.3), rgba(255,0,102,0.5))',
              border: '1px solid rgba(255,0,102,0.6)',
              color: '#ff0066',
              padding: '12px 40px',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 14,
              letterSpacing: 4,
              cursor: 'pointer',
              clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
              textShadow: '0 0 8px rgba(255,0,102,0.4)',
            }}
          >
            送信
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */

export default function PipeFlowPuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
