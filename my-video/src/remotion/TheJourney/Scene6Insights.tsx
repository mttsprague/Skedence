import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { JOURNEY_COLORS } from '../../../types/constants';

export const Scene6Insights: React.FC = () => {
  const frame = useCurrentFrame();

  // Revenue screenshot
  const revenueOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Charts screenshot (appears over revenue)
  const chartsOpacity = interpolate(frame, [90, 120], [0, 1], {
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

      {/* Revenue screenshot */}
      <div style={{ opacity: revenueOpacity }}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: 120,
            paddingBottom: 120,
            paddingLeft: 100,
            paddingRight: 100,
          }}
        >
          <Img
            src={staticFile('web-app-revenue-report.png')}
            style={{
              width: '75%',
              height: 'auto',
              borderRadius: 16,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          />
        </AbsoluteFill>
      </div>

      {/* Charts screenshot */}
      <div style={{ opacity: chartsOpacity }}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: 120,
            paddingBottom: 120,
            paddingLeft: 100,
            paddingRight: 100,
          }}
        >
          <Img
            src={staticFile('web-app-charts.png')}
            style={{
              width: '75%',
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
          Track your growth in real-time
        </div>
      </div>
    </AbsoluteFill>
  );
};
