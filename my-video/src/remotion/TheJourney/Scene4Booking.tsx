import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { JOURNEY_COLORS } from '../../../types/constants';
import { MobileFrame } from '../HowItWorks/MobileFrame';

export const Scene4Booking: React.FC = () => {
  const frame = useCurrentFrame();

  // Left phone (athlete booking)
  const leftPhoneOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Right phone (trainer receiving) - delayed
  const rightPhoneOpacity = interpolate(frame, [60, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Headline
  const headlineDelay = 40;
  const headlineOpacity = interpolate(frame, [headlineDelay, headlineDelay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Connection line between phones
  const lineOpacity = interpolate(frame, [100, 120], [0, 1], {
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

      {/* Left phone - Athlete booking */}
      <div
        style={{
          position: 'absolute',
          left: '18%',
          top: '50%',
          transform: 'translateY(-50%) scale(0.75)',
          opacity: leftPhoneOpacity,
        }}
      >
        <MobileFrame src="client-app-book-button.PNG" startFrame={0} animationDuration={30} />
      </div>

      {/* Right phone - Trainer receiving */}
      <div
        style={{
          position: 'absolute',
          right: '18%',
          top: '50%',
          transform: 'translateY(-50%) scale(0.75)',
          opacity: rightPhoneOpacity,
        }}
      >
        <MobileFrame src="trainer-app-scheduleview.PNG" startFrame={60} animationDuration={30} />
      </div>

      {/* Connection line */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '35%',
          right: '35%',
          height: 3,
          background: `linear-gradient(90deg, transparent, ${JOURNEY_COLORS.accent}, transparent)`,
          opacity: lineOpacity,
        }}
      />

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
          Book and confirm in seconds
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
