import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { VOLLEYBALL_COLORS, VOLLEYBALL_FPS } from '../../../types/constants';

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();

  // First line timing
  const line1Delay = 10;
  const line1Opacity = interpolate(frame, [line1Delay, line1Delay + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Second line timing (after 1 second pause)
  const line2Delay = VOLLEYBALL_FPS * 2; // 2 seconds total
  const line2Opacity = interpolate(frame, [line2Delay, line2Delay + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: VOLLEYBALL_COLORS.background,
      }}
    >
      {/* Subtle volleyball court lines in background */}
      <svg
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: 0.08,
        }}
      >
        {/* Vertical center line */}
        <line
          x1="50%"
          y1="0"
          x2="50%"
          y2="100%"
          stroke={VOLLEYBALL_COLORS.textSecondary}
          strokeWidth="3"
        />
        {/* Horizontal attack lines */}
        <line
          x1="0"
          y1="30%"
          x2="100%"
          y2="30%"
          stroke={VOLLEYBALL_COLORS.textSecondary}
          strokeWidth="2"
          strokeDasharray="10,10"
        />
        <line
          x1="0"
          y1="70%"
          x2="100%"
          y2="70%"
          stroke={VOLLEYBALL_COLORS.textSecondary}
          strokeWidth="2"
          strokeDasharray="10,10"
        />
        {/* Court outline */}
        <rect
          x="20%"
          y="15%"
          width="60%"
          height="70%"
          fill="none"
          stroke={VOLLEYBALL_COLORS.textSecondary}
          strokeWidth="2"
        />
      </svg>

      {/* Text content */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          {/* First line */}
          <div
            style={{
              color: VOLLEYBALL_COLORS.accent,
              fontSize: 64,
              fontWeight: 400,
              opacity: line1Opacity,
              marginBottom: 40,
            }}
          >
            Private Volleyball Coaches —
          </div>

          {/* Second line */}
          <div
            style={{
              color: VOLLEYBALL_COLORS.accent,
              fontSize: 72,
              fontWeight: 700,
              opacity: line2Opacity,
            }}
          >
            Still scheduling through text?
          </div>
        </div>
      </AbsoluteFill>

      {/* Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at center, transparent 50%, rgba(0, 0, 0, 0.5) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
