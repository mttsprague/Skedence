import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { HOWITWORKS_COLORS, HOWITWORKS_FPS } from '../../../types/constants';
import { MobileFrame } from './MobileFrame';

export const Scene5TrainersSchedule: React.FC = () => {
  const frame = useCurrentFrame();

  // Screen 1: Schedule view (0-5s)
  const screen1Opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const screen1FadeOut = interpolate(
    frame,
    [HOWITWORKS_FPS * 4.5, HOWITWORKS_FPS * 5],
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

  // Screen 2: Edit availability (5-9.5s)
  const screen2Start = HOWITWORKS_FPS * 5;
  const screen2Opacity = interpolate(
    frame,
    [screen2Start, screen2Start + 30],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const screen2FadeOut = interpolate(
    frame,
    [HOWITWORKS_FPS * 9, HOWITWORKS_FPS * 9.5],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Subtext 1 timing
  const subtext1Delay = screen2Start + 40;
  const subtext1Opacity = interpolate(frame, [subtext1Delay, subtext1Delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Screen 3: Lesson details (9.5-13.5s)
  const screen3Start = HOWITWORKS_FPS * 9.5;
  const screen3Opacity = interpolate(
    frame,
    [screen3Start, screen3Start + 30],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const screen3FadeOut = interpolate(
    frame,
    [HOWITWORKS_FPS * 13, HOWITWORKS_FPS * 13.5],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Subtext 2 timing
  const subtext2Delay = screen3Start + 40;
  const subtext2Opacity = interpolate(frame, [subtext2Delay, subtext2Delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Screen 4: Client history (13.5-16s)
  const screen4Start = HOWITWORKS_FPS * 13.5;
  const screen4Opacity = interpolate(
    frame,
    [screen4Start, screen4Start + 30],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Subtext 3 timing
  const subtext3Delay = screen4Start + 40;
  const subtext3Opacity = interpolate(frame, [subtext3Delay, subtext3Delay + 20], [0, 1], {
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

      {/* Screen 1: Schedule view */}
      <div style={{ opacity: screen1Opacity * screen1FadeOut }}>
        <MobileFrame src="trainer-app-scheduleview.PNG" startFrame={0} animationDuration={30} />
      </div>

      {/* Headline 1 */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 80,
          zIndex: 5,
          opacity: screen1Opacity * screen1FadeOut,
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

      {/* Screen 2: Edit availability */}
      <div style={{ opacity: screen2Opacity * screen2FadeOut }}>
        <MobileFrame
          src="trainer-app-edit-availability.PNG"
          startFrame={screen2Start}
          animationDuration={30}
        />
      </div>

      {/* Subtext 1 */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 80,
          zIndex: 5,
          opacity: screen2Opacity * screen2FadeOut,
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
          Update availability anytime
        </div>
      </AbsoluteFill>

      {/* Screen 3: Lesson details */}
      <div style={{ opacity: screen3Opacity * screen3FadeOut }}>
        <MobileFrame
          src="trainer-app-lesson-details.PNG"
          startFrame={screen3Start}
          animationDuration={30}
        />
      </div>

      {/* Subtext 2 */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 80,
          zIndex: 5,
          opacity: screen3Opacity * screen3FadeOut,
        }}
      >
        <div
          style={{
            color: HOWITWORKS_COLORS.accent,
            fontSize: 44,
            fontWeight: 400,
            textAlign: 'center',
            opacity: subtext2Opacity,
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
          }}
        >
          View lesson details instantly
        </div>
      </AbsoluteFill>

      {/* Screen 4: Client history */}
      <div style={{ opacity: screen4Opacity }}>
        <MobileFrame
          src="trainer-app-client-history.PNG"
          startFrame={screen4Start}
          animationDuration={30}
        />
      </div>

      {/* Subtext 3 */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 80,
          zIndex: 5,
          opacity: screen4Opacity,
        }}
      >
        <div
          style={{
            color: HOWITWORKS_COLORS.accent,
            fontSize: 44,
            fontWeight: 400,
            textAlign: 'center',
            opacity: subtext3Opacity,
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
          }}
        >
          Track athlete training history
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
