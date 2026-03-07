import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { BASKETBALL_COLORS } from '../../../types/constants';

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();

  // First line animation
  const line1Opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Second line animation - delayed
  const line2Delay = 60;
  const line2Opacity = interpolate(frame, [line2Delay, line2Delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BASKETBALL_COLORS.background,
      }}
    >
      {/* Subtle basketball court lines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.03,
          backgroundImage: `
            linear-gradient(90deg, ${BASKETBALL_COLORS.text} 1px, transparent 1px),
            linear-gradient(0deg, ${BASKETBALL_COLORS.text} 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
        }}
      />

      {/* Center circle subtle */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          height: 400,
          borderRadius: '50%',
          border: `2px solid ${BASKETBALL_COLORS.text}`,
          opacity: 0.02,
        }}
      />

      {/* Text content */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 200px',
        }}
      >
        <div
          style={{
            opacity: line1Opacity,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              color: BASKETBALL_COLORS.accent,
              fontSize: 56,
              fontWeight: 600,
              textAlign: 'center',
              lineHeight: 1.3,
            }}
          >
            Running a basketball training business
          </div>
        </div>

        <div
          style={{
            opacity: line2Opacity,
          }}
        >
          <div
            style={{
              color: BASKETBALL_COLORS.accent,
              fontSize: 64,
              fontWeight: 700,
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            You need an operating system
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
