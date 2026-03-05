import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { JOURNEY_COLORS } from '../../../types/constants';

export const Scene2Setup: React.FC = () => {
  const frame = useCurrentFrame();

  // Headline animation
  const headlineOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // First screenshot (packages)
  const screenshot1Opacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Second screenshot (time slots/availability)
  const screenshot2Opacity = interpolate(frame, [100, 120], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Bullet points
  const bulletDelay = 50;
  const bullet1Opacity = interpolate(frame, [bulletDelay, bulletDelay + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bullet2Opacity = interpolate(frame, [bulletDelay + 20, bulletDelay + 35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bullet3Opacity = interpolate(frame, [bulletDelay + 40, bulletDelay + 55], [0, 1], {
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

      {/* Screenshot 1 - Packages */}
      <div style={{ opacity: screenshot1Opacity }}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            padding: '0 100px',
          }}
        >
          <Img
            src={staticFile('web-app-lesson-packages.png')}
            style={{
              width: '70%',
              height: 'auto',
              borderRadius: 16,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          />
        </AbsoluteFill>
      </div>

      {/* Screenshot 2 - Time Slots (fades in over first) */}
      <div style={{ opacity: screenshot2Opacity }}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            padding: '0 100px',
          }}
        >
          <Img
            src={staticFile('web-app-time-slots.png')}
            style={{
              width: '70%',
              height: 'auto',
              borderRadius: 16,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          />
        </AbsoluteFill>
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
          Set up your business in minutes
        </div>
      </div>

      {/* Bullet points */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 60,
          zIndex: 5,
        }}
      >
        <div
          style={{
            color: JOURNEY_COLORS.accent,
            fontSize: 32,
            fontWeight: 400,
            opacity: bullet1Opacity,
          }}
        >
          Packages
        </div>
        <div
          style={{
            color: JOURNEY_COLORS.accent,
            fontSize: 32,
            fontWeight: 400,
            opacity: bullet2Opacity,
          }}
        >
          Availability
        </div>
        <div
          style={{
            color: JOURNEY_COLORS.accent,
            fontSize: 32,
            fontWeight: 400,
            opacity: bullet3Opacity,
          }}
        >
          Pricing
        </div>
      </div>
    </AbsoluteFill>
  );
};
