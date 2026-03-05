import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { HOWITWORKS_COLORS, HOWITWORKS_FPS } from '../../../types/constants';
import { ScreenshotCard } from '../Skedence/ScreenshotCard';

export const Scene7AutoUpdates: React.FC = () => {
  const frame = useCurrentFrame();

  // Booked session part (0-4.5s)
  const bookedOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bookedFadeOut = interpolate(
    frame,
    [HOWITWORKS_FPS * 4, HOWITWORKS_FPS * 4.5],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Subtext 1 timing
  const subtext1Delay = 40;
  const subtext1Opacity = interpolate(frame, [subtext1Delay, subtext1Delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Trainers part (4.5-8s)
  const trainersStart = HOWITWORKS_FPS * 4.5;
  const trainersOpacity = interpolate(
    frame,
    [trainersStart, trainersStart + 30],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Headline timing
  const headlineDelay = trainersStart + 40;
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

      {/* Booked session screenshot */}
      <div style={{ opacity: bookedOpacity * bookedFadeOut }}>
        <ScreenshotCard
          src="web-app-booked-session.png"
          startFrame={0}
          animationDuration={30}
        />
      </div>

      {/* Subtext 1 */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 100,
          zIndex: 5,
          opacity: bookedOpacity * bookedFadeOut,
        }}
      >
        <div
          style={{
            color: HOWITWORKS_COLORS.accent,
            fontSize: 44,
            fontWeight: 400,
            textAlign: 'center',
            opacity: subtext1Opacity,
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
          }}
        >
          Bookings appear instantly on your schedule
        </div>
      </AbsoluteFill>

      {/* Trainers screenshot */}
      <div style={{ opacity: trainersOpacity }}>
        <ScreenshotCard
          src="web-app-trainers.png"
          startFrame={trainersStart}
          animationDuration={30}
        />
      </div>

      {/* Headline */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 70,
          zIndex: 5,
          opacity: trainersOpacity,
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
          Manage multiple trainers from one system
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
