import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { JOURNEY_COLORS } from '../../../types/constants';

export const Scene1Opening: React.FC = () => {
  const frame = useCurrentFrame();

  // Headline animation - fade in with scale
  const headlineOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const headlineScale = interpolate(frame, [0, 30], [0.95, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Subtle pulse effect
  const pulse = interpolate(
    frame,
    [30, 60, 90, 120],
    [1, 1.02, 1, 1.02],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: JOURNEY_COLORS.background,
      }}
    >
      {/* Radial gradient background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at center, rgba(255, 107, 53, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Main headline */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 200px',
        }}
      >
        <div
          style={{
            opacity: headlineOpacity,
            transform: `scale(${headlineScale * pulse})`,
          }}
        >
          <div
            style={{
              color: JOURNEY_COLORS.accent,
              fontSize: 72,
              fontWeight: 700,
              textAlign: 'center',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            Your training business,
          </div>
          <div
            style={{
              color: JOURNEY_COLORS.text,
              fontSize: 72,
              fontWeight: 700,
              textAlign: 'center',
              lineHeight: 1.2,
              marginTop: 8,
              letterSpacing: '-0.02em',
            }}
          >
            simplified
          </div>
        </div>
      </AbsoluteFill>

      {/* Bottom accent line */}
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          width: interpolate(frame, [30, 60], [0, 200], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          height: 4,
          background: `linear-gradient(90deg, transparent, ${JOURNEY_COLORS.accent}, transparent)`,
          opacity: headlineOpacity,
        }}
      />
    </AbsoluteFill>
  );
};
