// ── STATIC ORBIT — Settings Panel ──
// Slide-out panel for volume controls with localStorage persistence.

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '../../audio/useAudio';

/* ── localStorage key ── */
const STORAGE_KEY = 'static-orbit-settings';

interface VolumeSettings {
  master: number;   // 0–100
  bgm: number;      // 0–100
  sfx: number;      // 0–100
  muted: boolean;
}

const DEFAULTS: VolumeSettings = {
  master: 70,
  bgm: 50,
  sfx: 70,
  muted: false,
};

/** Convert 0–100 slider value to dB. 0 → -Infinity, 100 → 0 dB. */
function sliderToDB(value: number): number {
  if (value <= 0) return -Infinity;
  // Attempt a roughly perceptual curve: dB = 20 * log10(value / 100)
  return 20 * Math.log10(value / 100);
}

function loadSettings(): VolumeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

function saveSettings(s: VolumeSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

/* ================================================================
   Component
   ================================================================ */

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<VolumeSettings>(loadSettings);
  const audio = useAudio();
  const panelRef = useRef<HTMLDivElement>(null);

  /* ── Apply volumes to the audio engine ── */
  const applyVolumes = useCallback(
    (s: VolumeSettings) => {
      if (s.muted) {
        audio.setMasterVolume(-Infinity);
      } else {
        audio.setMasterVolume(sliderToDB(s.master));
      }
      audio.setBGMVolume(sliderToDB(s.bgm));
      audio.setSFXVolume(sliderToDB(s.sfx));
    },
    [audio],
  );

  // Apply on mount (engine may not be ready yet — that's fine, useAudio is safe)
  useEffect(() => {
    applyVolumes(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Persist + apply whenever settings change ── */
  const update = useCallback(
    (patch: Partial<VolumeSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        saveSettings(next);
        applyVolumes(next);
        return next;
      });
    },
    [applyVolumes],
  );

  /* ── Close on outside click ── */
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    // Delay listener so the same click that opens doesn't immediately close
    const id = setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open]);

  /* ── Close on Escape ── */
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <>
      {/* ── Gear toggle button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="設定を開く"
        style={gearButtonStyle}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = '#00f0ff';
          (e.currentTarget as HTMLButtonElement).style.textShadow =
            '0 0 8px rgba(0,240,255,0.6)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,214,229,0.55)';
          (e.currentTarget as HTMLButtonElement).style.textShadow = 'none';
        }}
      >
        ⚙
      </button>

      {/* ── Slide-out panel ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="settings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={backdropStyle}
            />

            {/* Panel */}
            <motion.div
              ref={panelRef}
              key="settings-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
              style={panelStyle}
            >
              {/* Header */}
              <div style={headerStyle}>
                <span style={headerTitleStyle}>設定</span>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="閉じる"
                  style={closeButtonStyle}
                >
                  ✕
                </button>
              </div>

              {/* Sliders */}
              <div style={bodyStyle}>
                <VolumeSlider
                  label="マスター音量"
                  value={settings.muted ? 0 : settings.master}
                  onChange={(v) => update({ master: v, muted: false })}
                />
                <VolumeSlider
                  label="BGM音量"
                  value={settings.bgm}
                  onChange={(v) => update({ bgm: v })}
                />
                <VolumeSlider
                  label="SE音量"
                  value={settings.sfx}
                  onChange={(v) => update({ sfx: v })}
                />

                {/* Mute toggle */}
                <button
                  onClick={() => update({ muted: !settings.muted })}
                  style={{
                    ...muteButtonStyle,
                    background: settings.muted
                      ? 'rgba(255, 34, 68, 0.15)'
                      : 'rgba(0, 240, 255, 0.08)',
                    color: settings.muted ? '#ff2244' : '#00f0ff',
                    borderColor: settings.muted
                      ? 'rgba(255, 34, 68, 0.4)'
                      : 'rgba(0, 240, 255, 0.25)',
                  }}
                >
                  {settings.muted ? 'ミュート中' : 'ミュート'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Custom range input styles (injected once) */}
      <style>{rangeCSS}</style>
    </>
  );
}

/* ================================================================
   VolumeSlider sub-component
   ================================================================ */

function VolumeSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={sliderGroupStyle}>
      <div style={sliderHeaderStyle}>
        <span style={sliderLabelStyle}>{label}</span>
        <span style={sliderValueStyle}>{value}</span>
      </div>
      <input
        className="settings-range"
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          ...sliderInputStyle,
          background: `linear-gradient(to right, #00f0ff ${value}%, rgba(0,240,255,0.12) ${value}%)`,
        }}
      />
    </div>
  );
}

/* ================================================================
   Inline Styles
   ================================================================ */

const gearButtonStyle: React.CSSProperties = {
  position: 'fixed',
  top: 12,
  right: 14,
  zIndex: 100000,
  fontSize: '1.35rem',
  color: 'rgba(200,214,229,0.55)',
  background: 'rgba(10,10,15,0.45)',
  border: '1px solid rgba(0,240,255,0.12)',
  borderRadius: 4,
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'color 0.15s, text-shadow 0.15s, background 0.15s',
  backdropFilter: 'blur(4px)',
  lineHeight: 1,
  padding: 0,
};

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 99998,
  background: 'rgba(0,0,0,0.35)',
};

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  width: 300,
  maxWidth: '85vw',
  zIndex: 99999,
  background: 'rgba(10, 10, 20, 0.88)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderLeft: '1px solid rgba(0,240,255,0.18)',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '18px 20px 14px',
  borderBottom: '1px solid rgba(0,240,255,0.12)',
};

const headerTitleStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', sans-serif",
  fontSize: '0.95rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#00f0ff',
  textShadow: '0 0 6px rgba(0,240,255,0.35)',
};

const closeButtonStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  color: 'rgba(200,214,229,0.6)',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  padding: '2px 4px',
  lineHeight: 1,
  transition: 'color 0.15s',
};

const bodyStyle: React.CSSProperties = {
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 22,
  flex: 1,
  overflowY: 'auto',
};

const sliderGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const sliderHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
};

const sliderLabelStyle: React.CSSProperties = {
  fontFamily: "'Rajdhani', sans-serif",
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#c8d6e5',
  letterSpacing: '0.03em',
};

const sliderValueStyle: React.CSSProperties = {
  fontFamily: "'Share Tech Mono', monospace",
  fontSize: '0.8rem',
  color: '#00f0ff',
  minWidth: 28,
  textAlign: 'right',
};

const sliderInputStyle: React.CSSProperties = {
  width: '100%',
  height: 6,
  borderRadius: 0,
  outline: 'none',
  cursor: 'pointer',
  WebkitAppearance: 'none',
  appearance: 'none' as never,
};

const muteButtonStyle: React.CSSProperties = {
  marginTop: 4,
  padding: '8px 0',
  fontFamily: "'Orbitron', sans-serif",
  fontSize: '0.72rem',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  border: '1px solid',
  cursor: 'pointer',
  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
};

/* ================================================================
   Custom range input CSS (Webkit + Firefox)
   ================================================================ */

const rangeCSS = `
/* Webkit (Chrome / Safari / Edge) */
.settings-range::-webkit-slider-runnable-track {
  height: 6px;
  background: transparent; /* handled by inline gradient */
  border: none;
}
.settings-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  margin-top: -4px;
  background: #00f0ff;
  border: none;
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  cursor: pointer;
  box-shadow: 0 0 6px rgba(0,240,255,0.5);
}
.settings-range::-webkit-slider-thumb:hover {
  background: #66f7ff;
  box-shadow: 0 0 10px rgba(0,240,255,0.7);
}

/* Firefox */
.settings-range::-moz-range-track {
  height: 6px;
  background: rgba(0,240,255,0.12);
  border: none;
}
.settings-range::-moz-range-progress {
  height: 6px;
  background: #00f0ff;
}
.settings-range::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: #00f0ff;
  border: none;
  border-radius: 0;
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  cursor: pointer;
}
.settings-range::-moz-range-thumb:hover {
  background: #66f7ff;
}
`;
