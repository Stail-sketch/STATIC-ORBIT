// ===== STATIC ORBIT — Layer Stack Puzzle =====

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

const gridOverlayBg: React.CSSProperties = {
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

/* ── Mini Grid Renderer ────────────────────────────────────── */

function MiniGrid({ grid, cellSize, activeColor, label }: {
  grid: boolean[][];
  cellSize: number;
  activeColor: string;
  label?: string;
}) {
  return (
    <div>
      {label && (
        <div style={{
          textAlign: 'center', marginBottom: 4,
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 9, letterSpacing: 2,
          color: activeColor,
          opacity: 0.6,
        }}>
          {label}
        </div>
      )}
      <div style={{ display: 'inline-block', border: `1px solid ${activeColor}40` }}>
        {grid.map((row, r) => (
          <div key={r} style={{ display: 'flex' }}>
            {row.map((cell, c) => (
              <div key={c} style={{
                width: cellSize,
                height: cellSize,
                background: cell
                  ? activeColor
                  : 'rgba(0,0,0,0.3)',
                border: `1px solid ${activeColor}15`,
                boxShadow: cell ? `inset 0 0 ${cellSize / 3}px ${activeColor}40` : 'none',
              }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Observer View ─────────────────────────────────────────── */

function ObserverView({ roleData }: { roleData: Record<string, unknown> }) {
  const combinedPattern = roleData.combinedPattern as boolean[][];
  const layers = roleData.layers as boolean[][][];
  const layerCount = roleData.layerCount as number;

  const LAYER_COLORS = ['#00f0ff', '#ff0066', '#33ff66', '#ffaa00'];

  return (
    <div style={containerStyle}>
      <div style={panelStyle}>
        <div style={scanlineOverlay} />
        <div style={gridOverlayBg} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={headerStyle}>
          <div style={{ marginBottom: 4 }}>/// レイヤースタック 合成パターン ///</div>
          <div style={{ fontSize: 10, color: 'rgba(0,240,255,0.5)', letterSpacing: 2 }}>
            目標パターンとレイヤー順序をオペレーターに伝えてください
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 3 }}>
          {/* Combined pattern */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 10, letterSpacing: 2,
              color: 'rgba(0,240,255,0.5)',
              marginBottom: 8,
            }}>
              合成結果
            </div>
            <div style={{ display: 'inline-block' }}>
              <MiniGrid grid={combinedPattern} cellSize={36} activeColor="#00f0ff" />
            </div>
          </div>

          {/* Individual layers (in correct order) */}
          <div style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 10, letterSpacing: 2,
            color: 'rgba(0,240,255,0.5)',
            textAlign: 'center',
            marginBottom: 12,
          }}>
            正しいレイヤー順序 (上から下)
          </div>
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            {layers.map((layer, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, duration: 0.4 }}
                style={{
                  padding: 8,
                  background: 'rgba(0,0,0,0.3)',
                  border: `1px solid ${LAYER_COLORS[i % LAYER_COLORS.length]}30`,
                }}
              >
                <MiniGrid
                  grid={layer}
                  cellSize={20}
                  activeColor={LAYER_COLORS[i % LAYER_COLORS.length]}
                  label={`L${i + 1}`}
                />
              </motion.div>
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
          {layerCount}枚のレイヤー -- 正しい順序を口頭で伝達してください
        </div>
      </div>
    </div>
  );
}

/* ── Operator View ─────────────────────────────────────────── */

function OperatorView({ roleData }: { roleData: Record<string, unknown> }) {
  const layers = roleData.layers as boolean[][][];
  const layerCount = roleData.layerCount as number;
  const lastFeedback = useGameStore((s) => s.lastFeedback);

  const LAYER_COLORS = ['#ff0066', '#00f0ff', '#33ff66', '#ffaa00'];

  // Order: indices into the layers array (as displayed to operator)
  const [order, setOrder] = useState<number[]>(() => Array.from({ length: layerCount }, (_, i) => i));

  const moveUp = useCallback((pos: number) => {
    if (pos <= 0) return;
    setOrder(prev => {
      const next = [...prev];
      [next[pos - 1], next[pos]] = [next[pos], next[pos - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((pos: number) => {
    if (pos >= layerCount - 1) return;
    setOrder(prev => {
      const next = [...prev];
      [next[pos], next[pos + 1]] = [next[pos + 1], next[pos]];
      return next;
    });
  }, [layerCount]);

  const handleSubmit = useCallback(() => {
    const socket = getSocket();
    socket.emit('game:action', {
      puzzleId: 'layer-stack',
      action: 'stack',
      data: { order },
    });
  }, [order]);

  // Preview combined pattern based on current order
  const preview = (() => {
    const combined: boolean[][] = Array.from({ length: 5 }, () => Array(5).fill(false));
    for (const idx of order) {
      const layer = layers[idx];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (layer[r][c]) combined[r][c] = true;
        }
      }
    }
    return combined;
  })();

  return (
    <div style={containerStyle}>
      <div style={operatorPanelStyle}>
        <div style={scanlineOverlay} />
        <div style={gridOverlayBg} />
        <div style={cornerDecor('topLeft')} />
        <div style={cornerDecor('topRight')} />
        <div style={cornerDecor('bottomLeft')} />
        <div style={cornerDecor('bottomRight')} />

        <div style={{ ...headerStyle, color: '#ff0066', borderBottomColor: 'rgba(255,0,102,0.2)' }}>
          <div style={{ marginBottom: 4 }}>/// レイヤースタック 配置 ///</div>
          <div style={{ fontSize: 10, color: 'rgba(255,0,102,0.5)', letterSpacing: 2 }}>
            レイヤーを正しい順序に並べ替えよ
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

        <div style={{
          position: 'relative', zIndex: 3,
          display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {/* Layer ordering */}
          <div style={{ flex: '1 1 300px' }}>
            <div style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 10, letterSpacing: 2,
              color: 'rgba(255,0,102,0.5)',
              textAlign: 'center',
              marginBottom: 12,
            }}>
              レイヤー順序 (上から下)
            </div>

            {order.map((layerIdx, pos) => (
              <motion.div
                key={layerIdx}
                layout
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 12px',
                  marginBottom: 6,
                  background: 'rgba(0,0,0,0.3)',
                  border: `1px solid ${LAYER_COLORS[layerIdx % LAYER_COLORS.length]}30`,
                  borderLeft: `3px solid ${LAYER_COLORS[layerIdx % LAYER_COLORS.length]}`,
                }}
              >
                {/* Position number */}
                <div style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 16, fontWeight: 'bold',
                  color: LAYER_COLORS[layerIdx % LAYER_COLORS.length],
                  minWidth: 24, textAlign: 'center',
                  textShadow: `0 0 8px ${LAYER_COLORS[layerIdx % LAYER_COLORS.length]}60`,
                }}>
                  {pos + 1}
                </div>

                {/* Mini grid */}
                <MiniGrid
                  grid={layers[layerIdx]}
                  cellSize={14}
                  activeColor={LAYER_COLORS[layerIdx % LAYER_COLORS.length]}
                />

                {/* Label */}
                <div style={{
                  flex: 1,
                  fontSize: 11,
                  color: LAYER_COLORS[layerIdx % LAYER_COLORS.length],
                  opacity: 0.7,
                }}>
                  レイヤー {String.fromCharCode(65 + layerIdx)}
                </div>

                {/* Up/Down buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => moveUp(pos)}
                    disabled={pos === 0}
                    style={{
                      width: 24, height: 20,
                      background: pos === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,0,102,0.15)',
                      border: `1px solid ${pos === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,0,102,0.3)'}`,
                      color: pos === 0 ? 'rgba(255,255,255,0.1)' : '#ff0066',
                      cursor: pos === 0 ? 'default' : 'pointer',
                      fontSize: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 0,
                    }}
                  >
                    ▲
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => moveDown(pos)}
                    disabled={pos === layerCount - 1}
                    style={{
                      width: 24, height: 20,
                      background: pos === layerCount - 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,0,102,0.15)',
                      border: `1px solid ${pos === layerCount - 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,0,102,0.3)'}`,
                      color: pos === layerCount - 1 ? 'rgba(255,255,255,0.1)' : '#ff0066',
                      cursor: pos === layerCount - 1 ? 'default' : 'pointer',
                      fontSize: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 0,
                    }}
                  >
                    ▼
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Preview */}
          <div style={{ flex: '0 0 auto' }}>
            <div style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 10, letterSpacing: 2,
              color: 'rgba(255,0,102,0.5)',
              textAlign: 'center',
              marginBottom: 12,
            }}>
              プレビュー
            </div>
            <div style={{
              padding: 12,
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,0,102,0.15)',
            }}>
              <MiniGrid grid={preview} cellSize={28} activeColor="#ff0066" />
            </div>
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
            重ねる
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */

export default function LayerStackPuzzle({ roleData, role }: PuzzleProps) {
  if (role === 'observer') {
    return <ObserverView roleData={roleData} />;
  }
  return <OperatorView roleData={roleData} />;
}
