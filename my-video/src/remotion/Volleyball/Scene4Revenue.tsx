import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { VOLLEYBALL_COLORS, VOLLEYBALL_FPS } from '../../../types/constants';

export const Scene4Revenue: React.FC = () => {
  const frame = useCurrentFrame();

  // Stagger the metrics
  const metric1Delay = 20;
  const metric2Delay = 60;
  const metric3Delay = 100;
  const revenueDelay = VOLLEYBALL_FPS * 5; // 5 seconds
  const questionDelay = VOLLEYBALL_FPS * 8; // 8 seconds

  // Metric opacities
  const metric1Opacity = interpolate(frame, [metric1Delay, metric1Delay + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const metric2Opacity = interpolate(frame, [metric2Delay, metric2Delay + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const metric3Opacity = interpolate(frame, [metric3Delay, metric3Delay + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Revenue animation
  const revenueOpacity = interpolate(frame, [revenueDelay, revenueDelay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const revenueScale = interpolate(frame, [revenueDelay, revenueDelay + 30], [0.8, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Animate the number counting up
  const revenueNumber = interpolate(
    frame,
    [revenueDelay, revenueDelay + 40],
    [0, 8160],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Question opacity
  const questionOpacity = interpolate(frame, [questionDelay, questionDelay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Fade out metrics when revenue appears
  const metricsFadeOut = interpolate(
    frame,
    [revenueDelay - 20, revenueDelay + 10],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: VOLLEYBALL_COLORS.background,
      }}
    >
      {/* Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at center, transparent 50%, rgba(0, 0, 0, 0.6) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Metrics */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          opacity: metricsFadeOut,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              color: VOLLEYBALL_COLORS.accent,
              fontSize: 48,
              fontWeight: 400,
              opacity: metric1Opacity,
              marginBottom: 30,
            }}
          >
            12 athletes.
          </div>
          <div
            style={{
              color: VOLLEYBALL_COLORS.accent,
              fontSize: 48,
              fontWeight: 400,
              opacity: metric2Opacity,
              marginBottom: 30,
            }}
          >
            8 sessions per month.
          </div>
          <div
            style={{
              color: VOLLEYBALL_COLORS.accent,
              fontSize: 48,
              fontWeight: 400,
              opacity: metric3Opacity,
            }}
          >
            $85 per lesson.
          </div>
        </div>
      </AbsoluteFill>

      {/* Revenue number */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            transform: `scale(${revenueScale})`,
          }}
        >
          <div
            style={{
              color: VOLLEYBALL_COLORS.accent,
              fontSize: 96,
              fontWeight: 700,
              opacity: revenueOpacity,
              marginBottom: 80,
            }}
          >
            ${Math.floor(revenueNumber).toLocaleString()} / month
          </div>

          {/* Question */}
          <div
            style={{
              color: VOLLEYBALL_COLORS.accent,
              fontSize: 52,
              fontWeight: 400,
              opacity: questionOpacity,
            }}
          >
            You're managing that through text?
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
