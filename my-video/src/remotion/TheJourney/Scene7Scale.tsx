import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { JOURNEY_COLORS } from '../../../types/constants';
import { MobileFrame } from '../HowItWorks/MobileFrame';

export const Scene7Scale: React.FC = () => {
  const frame = useCurrentFrame();

  // All elements fade in together
  const elementsOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Headline
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

      <div style={{ opacity: elementsOpacity }}>
        {/* Left - Web Dashboard */}
        <div
          style={{
            position: 'absolute',
            left: '5%',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '28%',
          }}
        >
          <Img
            src={staticFile('web-app-dashboard-preview.png')}
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: 12,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
            }}
          />
        </div>

        {/* Center - Trainer App */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%) scale(0.65)',
          }}
        >
          <MobileFrame src="trainer-app-scheduleview.PNG" startFrame={0} animationDuration={30} />
        </div>

        {/* Right - Client App */}
        <div
          style={{
            position: 'absolute',
            right: '5%',
            top: '50%',
            transform: 'translateY(-50%) scale(0.65)',
          }}
        >
          <MobileFrame src="client-app-viewtrainer.PNG" startFrame={0} animationDuration={30} />
        </div>
      </div>

      {/* Headline */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: headlineOpacity,
          zIndex: 5,
        }}
      >
        <div
          style={{
            color: JOURNEY_COLORS.accent,
            fontSize: 56,
            fontWeight: 600,
          }}
        >
          Scale without the chaos
        </div>
      </div>

      {/* Subtext */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: interpolate(frame, [80, 100], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          zIndex: 5,
        }}
      >
        <div
          style={{
            color: JOURNEY_COLORS.accent,
            fontSize: 36,
            fontWeight: 400,
          }}
        >
          One system for your entire training business
        </div>
      </div>
    </AbsoluteFill>
  );
};
