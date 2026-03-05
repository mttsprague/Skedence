import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { HOWITWORKS_COLORS } from '../../../types/constants';
import { MobileFrame } from './MobileFrame';

export const Scene5_TrainerApps: React.FC = () => {
  const frame = useCurrentFrame();

  // First pair: Schedule view + Edit availability (0-7s)
  const pair1Opacity = interpolate(frame, [0, 30, 180, 210], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const headline1Delay = 40;
  const headline1Opacity = interpolate(
    frame,
    [headline1Delay, headline1Delay + 20, 180, 210],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Second pair: Lesson details + Client history (7s-14s)
  const pair2Opacity = interpolate(frame, [180, 210, 390, 420], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const headline2Delay = 220;
  const headline2Opacity = interpolate(
    frame,
    [headline2Delay, headline2Delay + 20, 390, 420],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

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

      {/* First Pair: Schedule + Availability */}
      <div style={{ opacity: pair1Opacity }}>
        {/* Left phone - Schedule view */}
        <div
          style={{
            position: 'absolute',
            left: '15%',
            top: '50%',
            transform: 'translateY(-50%) scale(0.75)',
          }}
        >
          <MobileFrame src="trainer-app-scheduleview.PNG" startFrame={0} animationDuration={30} />
        </div>

        {/* Right phone - Edit availability */}
        <div
          style={{
            position: 'absolute',
            right: '15%',
            top: '50%',
            transform: 'translateY(-50%) scale(0.75)',
          }}
        >
          <MobileFrame
            src="trainer-app-edit-availability.PNG"
            startFrame={0}
            animationDuration={30}
          />
        </div>

        {/* Headline */}
        <AbsoluteFill
          style={{
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingBottom: 55,
            zIndex: 5,
          }}
        >
          <div
            style={{
              color: HOWITWORKS_COLORS.accent,
              fontSize: 52,
              fontWeight: 600,
              textAlign: 'center',
              opacity: headline1Opacity,
              textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
            }}
          >
            Trainers manage their schedules on the go
          </div>
        </AbsoluteFill>
      </div>

      {/* Second Pair: Lesson Details + Client History */}
      <div style={{ opacity: pair2Opacity }}>
        {/* Left phone - Lesson details */}
        <div
          style={{
            position: 'absolute',
            left: '15%',
            top: '50%',
            transform: 'translateY(-50%) scale(0.75)',
          }}
        >
          <MobileFrame
            src="trainer-app-lesson-details.PNG"
            startFrame={180}
            animationDuration={30}
          />
        </div>

        {/* Right phone - Client history */}
        <div
          style={{
            position: 'absolute',
            right: '15%',
            top: '50%',
            transform: 'translateY(-50%) scale(0.75)',
          }}
        >
          <MobileFrame
            src="trainer-app-client-history.PNG"
            startFrame={180}
            animationDuration={30}
          />
        </div>

        {/* Headline */}
        <AbsoluteFill
          style={{
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingBottom: 55,
            zIndex: 5,
          }}
        >
          <div
            style={{
              color: HOWITWORKS_COLORS.accent,
              fontSize: 52,
              fontWeight: 600,
              textAlign: 'center',
              opacity: headline2Opacity,
              textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
            }}
          >
            View lesson details and track athlete progress
          </div>
        </AbsoluteFill>
      </div>
    </AbsoluteFill>
  );
};
