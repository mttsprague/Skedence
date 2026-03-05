import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { HOWITWORKS_COLORS } from '../../../types/constants';
import { MobileFrame } from './MobileFrame';

export const Scene5D_ClientHistory: React.FC = () => {
  const frame = useCurrentFrame();

  const screenOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textDelay = 40;
  const textOpacity = interpolate(frame, [textDelay, textDelay + 20], [0, 1], {
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
        <MobileFrame
          src="trainer-app-client-history.PNG"
          startFrame={0}
          animationDuration={30}
        />
      </div>

      {/* Text */}
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
            fontSize: 44,
            fontWeight: 400,
            textAlign: 'center',
            opacity: textOpacity,
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
          }}
        >
          Track athlete training history
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
