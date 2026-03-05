import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { JOURNEY_COLORS } from '../../../types/constants';

export const Scene8Closing: React.FC = () => {
  const frame = useCurrentFrame();

  // Logo animation
  const logoOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const logoScale = interpolate(frame, [0, 30], [0.9, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Brand name delay
  const brandDelay = 40;
  const brandOpacity = interpolate(frame, [brandDelay, brandDelay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Tagline delay
  const taglineDelay = 70;
  const taglineOpacity = interpolate(frame, [taglineDelay, taglineDelay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Orange glow pulse
  const glowPulse = interpolate(
    frame,
    [60, 90, 120],
    [0.6, 1, 0.6],
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
      {/* Orange glow background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at center, rgba(255, 107, 53, 0.2) 0%, transparent 60%)',
          opacity: glowPulse,
          pointerEvents: 'none',
        }}
      />

      {/* Logo */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
          }}
        >
          <Img
            src={staticFile('skedence-logo.png')}
            style={{
              width: 300,
              height: 'auto',
              filter:
                'brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)',
            }}
          />
        </div>
      </AbsoluteFill>

      {/* Brand name */}
      <div
        style={{
          position: 'absolute',
          top: '55%',
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: brandOpacity,
        }}
      >
        <div
          style={{
            color: JOURNEY_COLORS.text,
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}
        >
          SKEDENCE
        </div>
      </div>

      {/* Tagline */}
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: taglineOpacity,
        }}
      >
        <div
          style={{
            color: JOURNEY_COLORS.accent,
            fontSize: 42,
            fontWeight: 500,
          }}
        >
          Training business, perfected
        </div>
      </div>
    </AbsoluteFill>
  );
};
