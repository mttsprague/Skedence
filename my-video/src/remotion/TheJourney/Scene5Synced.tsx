import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { JOURNEY_COLORS } from '../../../types/constants';
import { MobileFrame } from '../HowItWorks/MobileFrame';

export const Scene5Synced: React.FC = () => {
  const frame = useCurrentFrame();

  // Both phones appear together
  const phonesOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Headline
  const headlineDelay = 40;
  const headlineOpacity = interpolate(frame, [headlineDelay, headlineDelay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Sync pulse effect
  const syncPulse = interpolate(
    frame,
    [60, 90, 120, 150],
    [1, 1.05, 1, 1.05],
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

      {/* Left phone - Trainer */}
      <div
        style={{
          position: 'absolute',
          left: '18%',
          top: '50%',
          transform: `translateY(-50%) scale(${0.75 * syncPulse})`,
          opacity: phonesOpacity,
        }}
      >
        <MobileFrame src="trainer-app-lesson-details.PNG" startFrame={0} animationDuration={30} />
      </div>

      {/* Right phone - Client */}
      <div
        style={{
          position: 'absolute',
          right: '18%',
          top: '50%',
          transform: `translateY(-50%) scale(${0.75 * syncPulse})`,
          opacity: phonesOpacity,
        }}
      >
        <MobileFrame src="client-app-book-button.PNG" startFrame={0} animationDuration={30} />
      </div>

      {/* Sync indicator circle */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 80,
          height: 80,
          borderRadius: '50%',
          border: `3px solid ${JOURNEY_COLORS.accent}`,
          opacity: interpolate(frame, [60, 80], [0, 0.8], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            fill={JOURNEY_COLORS.accent}
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 12 12"
              to="360 12 12"
              dur="1s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
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
          Everyone stays in sync
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
