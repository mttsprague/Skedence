import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { SOCCER_COLORS } from '../../../types/constants';

export const Scene4Math: React.FC = () => {
  const frame = useCurrentFrame();

  // Number 1: Athletes
  const num1Delay = 30;
  const num1Opacity = interpolate(frame, [num1Delay, num1Delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Number 2: Sessions
  const num2Delay = 80;
  const num2Opacity = interpolate(frame, [num2Delay, num2Delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Number 3: Price
  const num3Delay = 130;
  const num3Opacity = interpolate(frame, [num3Delay, num3Delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Revenue number - big reveal
  const revenueDelay = 200;
  const revenueOpacity = interpolate(frame, [revenueDelay, revenueDelay + 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const revenueScale = interpolate(frame, [revenueDelay, revenueDelay + 30], [0.9, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Final text - identity shift
  const finalDelay = 290;
  const final1Opacity = interpolate(frame, [finalDelay, finalDelay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const final2Opacity = interpolate(frame, [finalDelay + 40, finalDelay + 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: SOCCER_COLORS.background,
      }}
    >
      {/* Radial gradient for depth */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at center, rgba(255, 107, 53, 0.1) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 200px',
        }}
      >
        {/* Numbers build up */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 40,
            marginBottom: 80,
          }}
        >
          <div
            style={{
              color: SOCCER_COLORS.accent,
              fontSize: 48,
              fontWeight: 500,
              textAlign: 'center',
              opacity: num1Opacity,
            }}
          >
            20 athletes
          </div>
          <div
            style={{
              color: SOCCER_COLORS.accent,
              fontSize: 48,
              fontWeight: 500,
              textAlign: 'center',
              opacity: num2Opacity,
            }}
          >
            10 sessions/month average
          </div>
          <div
            style={{
              color: SOCCER_COLORS.accent,
              fontSize: 48,
              fontWeight: 500,
              textAlign: 'center',
              opacity: num3Opacity,
            }}
          >
            $90 per session
          </div>
        </div>

        {/* Revenue reveal */}
        <div
          style={{
            opacity: revenueOpacity,
            transform: `scale(${revenueScale})`,
            marginBottom: 100,
          }}
        >
          <div
            style={{
              color: SOCCER_COLORS.accent,
              fontSize: 96,
              fontWeight: 700,
              textAlign: 'center',
              letterSpacing: '-0.02em',
            }}
          >
            $18,000/month
          </div>
        </div>

        {/* Identity shift */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              color: SOCCER_COLORS.accent,
              fontSize: 52,
              fontWeight: 600,
              textAlign: 'center',
              opacity: final1Opacity,
            }}
          >
            That's not a side hustle
          </div>
          <div
            style={{
              color: SOCCER_COLORS.accent,
              fontSize: 60,
              fontWeight: 700,
              textAlign: 'center',
              opacity: final2Opacity,
            }}
          >
            That's a business
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
