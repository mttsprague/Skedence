import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { HOWITWORKS_COLORS, HOWITWORKS_FPS } from '../../../types/constants';
import { ScreenshotCard } from '../Skedence/ScreenshotCard';

export const Scene2RunBusiness: React.FC = () => {
  const frame = useCurrentFrame();

  // Dashboard part (0-6s)
  const dashboardOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dashboardFadeOut = interpolate(
    frame,
    [HOWITWORKS_FPS * 5.5, HOWITWORKS_FPS * 6],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Headline 1 timing
  const headline1Delay = 40;
  const headline1Opacity = interpolate(frame, [headline1Delay, headline1Delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const headline1FadeOut = interpolate(
    frame,
    [HOWITWORKS_FPS * 5.5, HOWITWORKS_FPS * 6],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Time slots part (6-10s)
  const timeSlotsStart = HOWITWORKS_FPS * 6;
  const timeSlotsOpacity = interpolate(
    frame,
    [timeSlotsStart, timeSlotsStart + 30],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Subtext timing
  const subtextDelay = timeSlotsStart + 40;
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

      {/* Dashboard screenshot */}
      <div style={{ opacity: dashboardOpacity * dashboardFadeOut }}>
        <ScreenshotCard
          src="web-app-dashboard-preview.png"
          startFrame={0}
          animationDuration={30}
        />
      </div>

      {/* Headline 1 */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 70,
          zIndex: 5,
          opacity: dashboardOpacity * dashboardFadeOut,
        }}
      >
        <div
          style={{
            color: HOWITWORKS_COLORS.accent,
            fontSize: 52,
            fontWeight: 600,
            textAlign: 'center',
            opacity: headline1Opacity * headline1FadeOut,
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
          }}
        >
          Run your entire training business from one dashboard
        </div>
      </AbsoluteFill>

      {/* Time slots screenshot */}
      <div style={{ opacity: timeSlotsOpacity }}>
        <ScreenshotCard
          src="web-app-time-slots.png"
          startFrame={timeSlotsStart}
          animationDuration={30}
        />
      </div>

      {/* Subtext */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 70,
          zIndex: 5,
          opacity: timeSlotsOpacity,
        }}
      >
        <div
          style={{
            color: HOWITWORKS_COLORS.accent,
            fontSize: 44,
            fontWeight: 400,
            textAlign: 'center',
            opacity: subtextOpacity,
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
          }}
        >
          Set trainer availability and manage your lesson schedule
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
