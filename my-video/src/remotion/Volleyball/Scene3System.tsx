import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { VOLLEYBALL_COLORS, VOLLEYBALL_FPS } from '../../../types/constants';
import { ScreenshotCard } from '../Skedence/ScreenshotCard';

export const Scene3System: React.FC = () => {
  const frame = useCurrentFrame();

  // Slow cinematic push-in
  const scale = interpolate(frame, [0, VOLLEYBALL_FPS * 20], [1, 1.1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Part 1: Scheduling dashboard (0-7s)
  const schedulingOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const schedulingFadeOutStart = VOLLEYBALL_FPS * 6.5;
  const schedulingFadeOut = interpolate(
    frame,
    [schedulingFadeOutStart, schedulingFadeOutStart + 20],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const schedulingVisible = schedulingOpacity * schedulingFadeOut;

  // Text 1 timing
  const text1Delay = 40;
  const text1Opacity = interpolate(frame, [text1Delay, text1Delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const text1FadeOut = interpolate(
    frame,
    [schedulingFadeOutStart, schedulingFadeOutStart + 20],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Part 2: Packages page (7-13s)
  const packagesStart = VOLLEYBALL_FPS * 7;
  const packagesOpacity = interpolate(
    frame,
    [packagesStart, packagesStart + 30],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const packagesFadeOutStart = VOLLEYBALL_FPS * 12.5;
  const packagesFadeOut = interpolate(
    frame,
    [packagesFadeOutStart, packagesFadeOutStart + 20],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const packagesVisible = packagesOpacity * packagesFadeOut;

  // Text 2 timing
  const text2Delay = packagesStart + 40;
  const text2Opacity = interpolate(
    frame,
    [text2Delay, text2Delay + 20],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  const text2FadeOut = interpolate(
    frame,
    [packagesFadeOutStart, packagesFadeOutStart + 20],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Part 3: Revenue page (13-20s)
  const revenueStart = VOLLEYBALL_FPS * 13;
  const revenueOpacity = interpolate(
    frame,
    [revenueStart, revenueStart + 30],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Text 3 timing
  const text3Delay = revenueStart + 40;
  const text3Opacity = interpolate(
    frame,
    [text3Delay, text3Delay + 20],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: VOLLEYBALL_COLORS.background,
        transform: `scale(${scale})`,
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

      {/* Scheduling dashboard */}
      <div style={{ opacity: schedulingVisible }}>
        <ScreenshotCard src="scheduling-dashboard.png" startFrame={0} animationDuration={30} />
      </div>

      {/* Packages page */}
      <div style={{ opacity: packagesVisible }}>
        <ScreenshotCard
          src="packages-or-trainers.png"
          startFrame={packagesStart}
          animationDuration={30}
        />
      </div>

      {/* Revenue page */}
      <div style={{ opacity: revenueOpacity }}>
        <ScreenshotCard src="revenue-report.png" startFrame={revenueStart} animationDuration={30} />
      </div>

      {/* Text 1: Set your availability once - Bottom */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 150,
          zIndex: 5,
        }}
      >
        <div
          style={{
            color: VOLLEYBALL_COLORS.accent,
            fontSize: 56,
            fontWeight: 400,
            textAlign: 'center',
            opacity: text1Opacity * text1FadeOut,
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
          }}
        >
          Set your availability once.
        </div>
      </AbsoluteFill>

      {/* Text 2: Sell lesson packages - Bottom */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 150,
          zIndex: 5,
        }}
      >
        <div
          style={{
            color: VOLLEYBALL_COLORS.accent,
            fontSize: 56,
            fontWeight: 400,
            textAlign: 'center',
            opacity: text2Opacity * text2FadeOut,
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
          }}
        >
          Sell lesson packages.
        </div>
      </AbsoluteFill>

      {/* Text 3: Track revenue in one place - Top */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-start',
          alignItems: 'center',
          paddingTop: 100,
          zIndex: 5,
        }}
      >
        <div
          style={{
            color: VOLLEYBALL_COLORS.accent,
            fontSize: 56,
            fontWeight: 400,
            textAlign: 'center',
            opacity: text3Opacity,
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
          }}
        >
          Track revenue in one place.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
