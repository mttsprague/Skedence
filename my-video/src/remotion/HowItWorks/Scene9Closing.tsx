import React from 'react';
import { AbsoluteFill, interpolate, Img, useCurrentFrame, staticFile } from 'remotion';
import { HOWITWORKS_COLORS, HOWITWORKS_FPS } from '../../../types/constants';

export const Scene9Closing: React.FC = () => {
  const frame = useCurrentFrame();

  // Logo appearance
  const logoOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const logoScale = interpolate(frame, [0, 30], [0.9, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Headline timing
  const headlineDelay = 40;
  const headlineOpacity = interpolate(frame, [headlineDelay, headlineDelay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Subtext timing
  const subtextDelay = HOWITWORKS_FPS * 3;
  const subtextOpacity = interpolate(frame, [subtextDelay, subtextDelay + 20], [0, 1], {
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
            'radial-gradient(circle at center, transparent 40%, rgba(0, 0, 0, 0.6) 100%)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* Logo section */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          opacity: logoOpacity,
        }}
      >
        <div
          style={{
            textAlign: 'center',
            transform: `scale(${logoScale})`,
          }}
        >
          {/* Logo */}
          <div
            style={{
              marginBottom: 60,
              padding: 20,
              borderRadius: 20,
              background: '#000000',
              display: 'inline-block',
            }}
          >
            <Img
              src={staticFile('skedence-logo.png')}
              style={{
                width: 400,
                height: 'auto',
                display: 'block',
                filter:
                  'invert(1) sepia(1) saturate(5) hue-rotate(330deg) brightness(1.1) drop-shadow(0 0 30px rgba(255, 107, 53, 0.8))',
              }}
            />
          </div>

          {/* Headline */}
          <div
            style={{
              color: HOWITWORKS_COLORS.accent,
              fontSize: 52,
              fontWeight: 600,
              textAlign: 'center',
              opacity: headlineOpacity,
              marginBottom: 40,
            }}
          >
            Run your training like a business
          </div>

          {/* Subtext */}
          <div
            style={{
              color: HOWITWORKS_COLORS.accent,
              fontSize: 44,
              fontWeight: 400,
              textAlign: 'center',
              opacity: subtextOpacity,
            }}
          >
            Start your free trial today
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
