import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { HOWITWORKS_COLORS, HOWITWORKS_FPS } from '../../../types/constants';
import { ScreenshotCard } from '../Skedence/ScreenshotCard';

export const Scene3Packages: React.FC = () => {
  const frame = useCurrentFrame();

  // Screenshot opacity
  const screenshotOpacity = interpolate(frame, [0, 30], [0, 1], {
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
            'radial-gradient(circle at center, transparent 40%, rgba(0, 0, 0, 0.5) 100%)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* Screenshot */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-start',
          alignItems: 'center',
          paddingTop: 60,
        }}
      >
        <div style={{ opacity: screenshotOpacity }}>
          <ScreenshotCard src="web-app-lesson-packages.png" startFrame={0} animationDuration={30} />
        </div>
      </AbsoluteFill>

      {/* Text overlay */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 40,
          zIndex: 5,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          {/* Headline */}
          <div
            style={{
              color: HOWITWORKS_COLORS.accent,
              fontSize: 52,
              fontWeight: 600,
              opacity: headlineOpacity,
              marginBottom: 40,
              textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
            }}
          >
            Create lesson packages athletes can purchase
          </div>

          {/* Subtext */}
          <div
            style={{
              color: HOWITWORKS_COLORS.accent,
              fontSize: 40,
              fontWeight: 400,
              opacity: subtextOpacity,
              textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
            }}
          >
            Athletes buy sessions before booking lessons
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
