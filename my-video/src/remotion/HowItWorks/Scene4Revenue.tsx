import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { HOWITWORKS_COLORS, HOWITWORKS_FPS } from '../../../types/constants';
import { ScreenshotCard } from '../Skedence/ScreenshotCard';

export const Scene4Revenue: React.FC = () => {
  const frame = useCurrentFrame();

  // Revenue report part (0-4.5s)
  const revenueOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const revenueFadeOut = interpolate(
    frame,
    [HOWITWORKS_FPS * 4, HOWITWORKS_FPS * 4.5],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Charts part (4.5-10s)
  const chartsStart = HOWITWORKS_FPS * 4.5;
  const chartsOpacity = interpolate(
    frame,
    [chartsStart, chartsStart + 30],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Headline timing
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

      {/* Revenue report screenshot */}
      <div style={{ opacity: revenueOpacity * revenueFadeOut }}>
        <ScreenshotCard src="web-app-revenue-report.png" startFrame={0} animationDuration={30} />
      </div>

      {/* Charts screenshot */}
      <div style={{ opacity: chartsOpacity }}>
        <ScreenshotCard src="web-app-charts.png" startFrame={chartsStart} animationDuration={30} />
      </div>

      {/* Headline */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 70,
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
          Track revenue and lesson activity automatically
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
