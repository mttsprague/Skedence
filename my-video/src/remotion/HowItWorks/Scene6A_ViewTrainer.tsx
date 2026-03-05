import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { HOWITWORKS_COLORS } from '../../../types/constants';
import { MobileFrame } from './MobileFrame';

export const Scene6A_ViewTrainer: React.FC = () => {
  const frame = useCurrentFrame();

  const screenOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const headlineDelay = 40;
  const headlineOpacity = interpolate(frame, [headlineDelay, headlineDelay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: HOWITWORKS_COLORS.background,
      }}
    >
      {/* Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at center, transparent 40%, rgba(0, 0, 0, 0.5) 100%)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* Screenshot */}
      <div style={{ opacity: screenOpacity }}>
        <MobileFrame src="client-app-viewtrainer.PNG" startFrame={0} animationDuration={30} />
      </div>

      {/* Headline */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 55,
          zIndex: 5,
        }}
      >
        <div
          style={{
            color: HOWITWORKS_COLORS.accent,
            fontSize: 52,
            fontWeight: 600,
            textAlign: 'center',
            opacity: headlineOpacity,
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
          }}
        >
          Athletes choose their trainer
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
