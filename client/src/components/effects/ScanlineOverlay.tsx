import React from 'react';

/**
 * Full-screen CRT scanline + noise overlay.
 * Purely cosmetic — pointer-events: none keeps it non-interactive.
 */
const ScanlineOverlay: React.FC = React.memo(() => {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Scanlines — horizontal 2px bars repeating */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0, 0, 0, 0.06) 1px, rgba(0, 0, 0, 0.06) 2px)',
          backgroundSize: '100% 2px',
        }}
      />

      {/* Slow-moving scan band — a bright bar that drifts down */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '6px',
          background:
            'linear-gradient(180deg, transparent, rgba(0, 240, 255, 0.03), transparent)',
          animation: 'scanline 8s linear infinite',
        }}
      />

      {/* Faint noise texture via tiny hard-stop gradients */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.035,
          backgroundImage: `
            repeating-linear-gradient(
              90deg,
              rgba(255,255,255,0.06) 0px,
              transparent 1px,
              transparent 2px
            ),
            repeating-linear-gradient(
              0deg,
              rgba(255,255,255,0.04) 0px,
              transparent 1px,
              transparent 3px
            )
          `,
          backgroundSize: '3px 3px, 2px 4px',
          mixBlendMode: 'overlay',
        }}
      />

      {/* Very subtle vignette around edges */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow: 'inset 0 0 120px 40px rgba(0, 0, 0, 0.4)',
        }}
      />
    </div>
  );
});

ScanlineOverlay.displayName = 'ScanlineOverlay';

export default ScanlineOverlay;
