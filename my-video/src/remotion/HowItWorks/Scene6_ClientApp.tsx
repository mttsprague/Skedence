import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { HOWITWORKS_COLORS } from '../../../types/constants';
import { MobileFrame } from './MobileFrame';

export const Scene6_ClientApp: React.FC = () => {
  const frame = useCurrentFrame();

  const phonesOpacity = interpolate(frame, [0, 30], [0, 1], {
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

      <div style={{ opacity: phonesOpacity }}>
        {/* Left phone - View trainer */}
        <div
          style={{
            position: 'absolute',
            left: '8%',
            top: '50%',
            transform: 'translateY(-50%) scale(0.85)',
          }}
        >
          <MobileFrame src="client-app-viewtrainer.PNG" startFrame={0} animationDuration={30} />
        </div>

        {/* Center phone - Purchase passes */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%) scale(0.85)',
          }}
        >
          <MobileFrame
            src="client-app-purchase-passes.PNG"
            startFrame={0}
            animationDuration={30}
          />
        </div>

        {/* Right phone - Book lessons */}
        <div
          style={{
            position: 'absolute',
            right: '8%',
            top: '50%',
            transform: 'translateY(-50%) scale(0.85)',
          }}
        >
          <MobileFrame src="client-app-book-button.PNG" startFrame={0} animationDuration={30} />
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
            Athletes browse, purchase, and book lessons instantly
          </div>
        </AbsoluteFill>
      </div>
    </AbsoluteFill>
  );
};
