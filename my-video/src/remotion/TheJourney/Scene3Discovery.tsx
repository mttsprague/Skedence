import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { JOURNEY_COLORS } from '../../../types/constants';
import { MobileFrame } from '../HowItWorks/MobileFrame';

export const Scene3Discovery: React.FC = () => {
  const frame = useCurrentFrame();

  // Phone animation
  const phoneOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const phoneScale = interpolate(frame, [0, 30], [0.9, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Headline animation
  const headlineDelay = 40;
  const headlineOpacity = interpolate(frame, [headlineDelay, headlineDelay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: JOURNEY_COLORS.background,
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

      {/* Mobile phone */}
      <div
        style={{
          opacity: phoneOpacity,
          transform: `scale(${phoneScale * 0.85})`,
        }}
      >
        <MobileFrame src="client-app-viewtrainer.PNG" startFrame={0} animationDuration={30} />
      </div>

      {/* Headline */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 60,
          zIndex: 5,
        }}
      >
        <div
          style={{
            color: JOURNEY_COLORS.accent,
            fontSize: 56,
            fontWeight: 600,
            textAlign: 'center',
            opacity: headlineOpacity,
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
          }}
        >
          Athletes find you instantly
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
